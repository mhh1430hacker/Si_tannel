from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import QDifficulty, Question, UserAnswer

DIFFICULTY_ORDER = [QDifficulty.EASY, QDifficulty.MEDIUM, QDifficulty.HARD]
DIFFICULTY_LEVEL = {d: i for i, d in enumerate(DIFFICULTY_ORDER)}


def get_next_mvp_question(
    db: Session,
    category: str,
    last_was_correct: bool,
    current_difficulty: str,
    session_id: str | None = None,
) -> Question | None:
    """
    Strict Deterministic Rule-Based Adaptive Routing for Phase 1.

    Rules:
    - Correct answer: step UP difficulty (سهل -> متوسط -> صعب)
    - Incorrect answer: step DOWN difficulty (صعب -> متوسط -> سهل)
    - If no question at target difficulty, fallback to متوسط
    - Avoids repeating questions already answered in the current session
    """
    difficulty_map = {"سهل": 0, "متوسط": 1, "صعب": 2}
    rev_map = {0: QDifficulty.EASY, 1: QDifficulty.MEDIUM, 2: QDifficulty.HARD}

    current_level = difficulty_map.get(current_difficulty, 1)

    if last_was_correct:
        next_level = min(2, current_level + 1)
    else:
        next_level = max(0, current_level - 1)

    target_difficulty = rev_map[next_level]

    # Build base query excluding already-answered questions in this session
    base_query = db.query(Question).filter(
        Question.skill_category == category,
    )
    if session_id:
        answered_ids = (
            db.query(UserAnswer.question_id)
            .filter(UserAnswer.session_id == session_id)
            .subquery()
        )
        base_query = base_query.filter(Question.id.notin_(answered_ids))

    # Try target difficulty first
    next_q = (
        base_query.filter(Question.difficulty == target_difficulty)
        .order_by(func.random())
        .first()
    )

    # Fallback to medium if target is empty
    if not next_q:
        next_q = (
            base_query.filter(Question.difficulty == QDifficulty.MEDIUM)
            .order_by(func.random())
            .first()
        )

    # Final fallback: any question in category
    if not next_q:
        next_q = base_query.order_by(func.random()).first()

    return next_q


def get_first_question(db: Session, category: str) -> Question | None:
    """Get a random question to start the session. Prefers easy, falls back to medium, then any."""
    q = (
        db.query(Question)
        .filter(
            Question.skill_category == category,
            Question.difficulty == QDifficulty.EASY,
        )
        .order_by(func.random())
        .first()
    )
    if not q:
        q = (
            db.query(Question)
            .filter(
                Question.skill_category == category,
                Question.difficulty == QDifficulty.MEDIUM,
            )
            .order_by(func.random())
            .first()
        )
    if not q:
        q = (
            db.query(Question)
            .filter(Question.skill_category == category)
            .order_by(func.random())
            .first()
        )
    return q
