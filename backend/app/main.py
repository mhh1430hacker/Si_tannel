import uuid
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.analytics.routing import get_first_question, get_next_mvp_question
from app.database import get_db
from app.models import Question, QuestionChoice, UserAnswer

app = FastAPI(title="Ainex Qudrat Lab", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic Schemas ---


class ChoiceOut(BaseModel):
    id: int
    choice_text: str

    class Config:
        from_attributes = True


class QuestionOut(BaseModel):
    id: int
    content: str
    skill_category: str
    difficulty: str
    expected_time_seconds: int
    choices: list[ChoiceOut]

    class Config:
        from_attributes = True


class SubmitAnswerRequest(BaseModel):
    user_id: str
    session_id: str
    question_id: int
    chosen_choice_id: int
    time_taken_seconds: int


class SubmitAnswerResponse(BaseModel):
    is_correct: bool
    correct_choice_id: int
    next_question: QuestionOut | None


class SessionSummary(BaseModel):
    session_id: str
    total_questions: int
    correct_count: int
    incorrect_count: int
    accuracy_percentage: float
    total_time_seconds: int


# --- Helper ---


def question_to_out(q: Question) -> QuestionOut:
    return QuestionOut(
        id=q.id,
        content=q.content,
        skill_category=q.skill_category,
        difficulty=q.difficulty.value,
        expected_time_seconds=q.expected_time_seconds,
        choices=[ChoiceOut(id=c.id, choice_text=c.choice_text) for c in q.choices],
    )


# --- Endpoints ---


@app.get("/api/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    """List all available skill categories."""
    rows = db.query(Question.skill_category).distinct().all()
    return [r[0] for r in rows]


@app.get("/api/question/first", response_model=QuestionOut)
def get_first(category: str, db: Session = Depends(get_db)):
    """Get the first question to start a test session (always easy)."""
    q = get_first_question(db, category)
    if not q:
        raise HTTPException(status_code=404, detail="لا توجد أسئلة في هذا التصنيف")
    return question_to_out(q)


@app.post("/api/answer/submit", response_model=SubmitAnswerResponse)
def submit_answer(req: SubmitAnswerRequest, db: Session = Depends(get_db)):
    """Submit an answer and receive the next adaptive question."""
    question = db.query(Question).filter(Question.id == req.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")

    chosen_choice = (
        db.query(QuestionChoice).filter(QuestionChoice.id == req.chosen_choice_id).first()
    )
    if not chosen_choice:
        raise HTTPException(status_code=404, detail="الاختيار غير موجود")

    correct_choice = (
        db.query(QuestionChoice)
        .filter(
            QuestionChoice.question_id == req.question_id,
            QuestionChoice.is_correct == True,
        )
        .first()
    )

    is_correct = chosen_choice.is_correct

    # Record user answer
    answer = UserAnswer(
        user_id=uuid.UUID(req.user_id),
        session_id=uuid.UUID(req.session_id),
        question_id=req.question_id,
        chosen_choice_id=req.chosen_choice_id,
        time_taken_seconds=req.time_taken_seconds,
        is_correct=is_correct,
        answered_at=datetime.utcnow(),
    )
    db.add(answer)
    db.commit()

    # Get next question via deterministic routing
    next_q = get_next_mvp_question(
        db=db,
        category=question.skill_category,
        last_was_correct=is_correct,
        current_difficulty=question.difficulty.value,
        session_id=req.session_id,
    )

    return SubmitAnswerResponse(
        is_correct=is_correct,
        correct_choice_id=correct_choice.id if correct_choice else chosen_choice.id,
        next_question=question_to_out(next_q) if next_q else None,
    )


@app.get("/api/session/{session_id}/summary", response_model=SessionSummary)
def get_session_summary(session_id: str, db: Session = Depends(get_db)):
    """Get a summary of a completed test session."""
    answers = (
        db.query(UserAnswer)
        .filter(UserAnswer.session_id == uuid.UUID(session_id))
        .all()
    )
    if not answers:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")

    correct_count = sum(1 for a in answers if a.is_correct)
    total = len(answers)
    total_time = sum(a.time_taken_seconds for a in answers)

    return SessionSummary(
        session_id=session_id,
        total_questions=total,
        correct_count=correct_count,
        incorrect_count=total - correct_count,
        accuracy_percentage=round((correct_count / total) * 100, 1) if total > 0 else 0,
        total_time_seconds=total_time,
    )


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ainex-qudrat-lab"}
