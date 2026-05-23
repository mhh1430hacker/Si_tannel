"""
Forms Router: Import questions from Google Forms.
Handles form scraping, question extraction, and database insertion.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FormImport, QDifficulty, Question, QuestionChoice
from app.services.form_scraper import (
    MCQ_COMPATIBLE_TYPES,
    scrape_google_form,
)

router = APIRouter(prefix="/api/forms", tags=["forms"])


# Default expected time for imported questions (45 seconds)
DEFAULT_EXPECTED_TIME = 45


class ImportFormRequest(BaseModel):
    form_url: str
    skill_category: str
    difficulty: str = "متوسط"
    correct_choice_index: dict[str, int] | None = None


class ImportedQuestionOut(BaseModel):
    id: int
    content: str
    image_url: str | None
    choices_count: int

    class Config:
        from_attributes = True


class ImportFormResponse(BaseModel):
    form_title: str
    total_extracted: int
    questions_imported: int
    skipped_non_mcq: int
    questions: list[ImportedQuestionOut]


class FormImportOut(BaseModel):
    id: int
    form_url: str
    form_title: str | None
    skill_category: str
    difficulty: str
    questions_imported: int
    imported_at: str

    class Config:
        from_attributes = True


class FormPreviewQuestion(BaseModel):
    question_id: str
    text: str
    image_url: str | None
    question_type: int | None
    choices: list[dict]
    is_mcq: bool


class FormPreviewResponse(BaseModel):
    title: str
    description: str
    total_questions: int
    mcq_questions: int
    questions: list[FormPreviewQuestion]


@router.post("/preview", response_model=FormPreviewResponse)
async def preview_form(req: ImportFormRequest):
    """
    Preview a Google Form without importing. Shows extracted questions
    so the user can verify before committing to the database.
    """
    try:
        form_data = await scrape_google_form(req.form_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))

    preview_questions = []
    mcq_count = 0
    for q in form_data.questions:
        is_mcq = q.question_type is not None and q.question_type in MCQ_COMPATIBLE_TYPES and len(q.choices) >= 2
        if is_mcq:
            mcq_count += 1
        preview_questions.append(FormPreviewQuestion(
            question_id=q.question_id,
            text=q.text,
            image_url=q.image_url,
            question_type=q.question_type,
            choices=[{"text": c.text, "image_url": c.image_url} for c in q.choices],
            is_mcq=is_mcq,
        ))

    return FormPreviewResponse(
        title=form_data.title,
        description=form_data.description,
        total_questions=len(form_data.questions),
        mcq_questions=mcq_count,
        questions=preview_questions,
    )


@router.post("/import", response_model=ImportFormResponse)
async def import_form(req: ImportFormRequest, db: Session = Depends(get_db)):
    """
    Import questions from a Google Form into the database.
    Only imports MCQ-compatible questions (multiple choice, checkboxes, dropdown).
    Non-MCQ questions (text, paragraph) are skipped.

    If the form was already imported, re-syncs: adds new questions, skips existing.
    """
    # Validate difficulty
    difficulty_map = {"سهل": QDifficulty.EASY, "متوسط": QDifficulty.MEDIUM, "صعب": QDifficulty.HARD}
    difficulty_enum = difficulty_map.get(req.difficulty, QDifficulty.MEDIUM)

    # Scrape the form
    try:
        form_data = await scrape_google_form(req.form_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Check if form was already imported (update/resync)
    existing_import = db.query(FormImport).filter(
        FormImport.form_url == form_data.form_url
    ).first()

    if existing_import:
        form_import = existing_import
        form_import.last_synced_at = datetime.utcnow()
        form_import.form_title = form_data.title
    else:
        form_import = FormImport(
            form_url=form_data.form_url,
            form_title=form_data.title,
            skill_category=req.skill_category,
            difficulty=difficulty_enum,
        )
        db.add(form_import)
        db.flush()

    # Import questions
    imported_questions: list[ImportedQuestionOut] = []
    skipped = 0

    for fq in form_data.questions:
        # Only import MCQ-compatible types with at least 2 choices
        if fq.question_type is None or fq.question_type not in MCQ_COMPATIBLE_TYPES or len(fq.choices) < 2:
            skipped += 1
            continue

        # Skip if already imported (by form_question_id)
        existing_q = db.query(Question).filter(
            Question.form_import_id == form_import.id,
            Question.form_question_id == fq.question_id,
        ).first()
        if existing_q:
            imported_questions.append(ImportedQuestionOut(
                id=existing_q.id,
                content=existing_q.content,
                image_url=existing_q.image_url,
                choices_count=len(existing_q.choices),
            ))
            continue

        # Build question content: text + optional image reference
        content = fq.text if fq.text else ""
        if fq.image_url and not content:
            content = "[سؤال مصور]"

        question = Question(
            content=content,
            skill_category=req.skill_category,
            difficulty=difficulty_enum,
            expected_time_seconds=DEFAULT_EXPECTED_TIME,
            image_url=fq.image_url,
            form_import_id=form_import.id,
            form_question_id=fq.question_id,
        )
        db.add(question)
        db.flush()

        # Add choices — first choice is marked correct by default
        # (user can specify correct answers via correct_choice_index)
        correct_idx = 0
        if req.correct_choice_index and fq.question_id in req.correct_choice_index:
            correct_idx = req.correct_choice_index[fq.question_id]

        for idx, fc in enumerate(fq.choices):
            choice = QuestionChoice(
                question_id=question.id,
                choice_text=fc.text,
                is_correct=(idx == correct_idx),
                image_url=fc.image_url,
            )
            db.add(choice)

        imported_questions.append(ImportedQuestionOut(
            id=question.id,
            content=content,
            image_url=fq.image_url,
            choices_count=len(fq.choices),
        ))

    # Update import stats
    form_import.questions_imported = len(imported_questions)
    db.commit()

    return ImportFormResponse(
        form_title=form_data.title,
        total_extracted=len(form_data.questions),
        questions_imported=len(imported_questions),
        skipped_non_mcq=skipped,
        questions=imported_questions,
    )


@router.get("/imports", response_model=list[FormImportOut])
def list_imports(db: Session = Depends(get_db)):
    """List all form imports."""
    imports = db.query(FormImport).order_by(FormImport.imported_at.desc()).all()
    return [
        FormImportOut(
            id=fi.id,
            form_url=fi.form_url,
            form_title=fi.form_title,
            skill_category=fi.skill_category,
            difficulty=fi.difficulty.value,
            questions_imported=fi.questions_imported,
            imported_at=fi.imported_at.isoformat(),
        )
        for fi in imports
    ]


@router.delete("/imports/{import_id}")
def delete_import(import_id: int, db: Session = Depends(get_db)):
    """Delete a form import and all its questions."""
    form_import = db.query(FormImport).filter(FormImport.id == import_id).first()
    if not form_import:
        raise HTTPException(status_code=404, detail="عملية الاستيراد غير موجودة")

    # Delete associated questions (cascade handles choices)
    db.query(Question).filter(Question.form_import_id == import_id).delete()
    db.delete(form_import)
    db.commit()
    return {"detail": "تم حذف الاستيراد وأسئلته بنجاح"}
