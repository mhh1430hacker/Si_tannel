"""
NudgeLimiter: Enforces the Rule of Rarity.
Maximum TWO observational nudges per study session.
Never interpretive. Always clinical and data-driven.
"""

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import AnswerTelemetry, SessionNudge, UserAnswer

MAX_NUDGES_PER_SESSION = 2

VELOCITY_THRESHOLD = 0.5
ACCURACY_DROP_WINDOW = 4
ACCURACY_DROP_THRESHOLD = 0.5


def get_session_nudge_count(db: Session, session_id: uuid.UUID) -> int:
    return (
        db.query(SessionNudge)
        .filter(SessionNudge.session_id == session_id)
        .count()
    )


def can_deliver_nudge(db: Session, session_id: uuid.UUID) -> bool:
    return get_session_nudge_count(db, session_id) < MAX_NUDGES_PER_SESSION


def record_nudge(
    db: Session,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    nudge_text: str,
) -> SessionNudge | None:
    if not can_deliver_nudge(db, session_id):
        return None

    nudge = SessionNudge(
        session_id=session_id,
        user_id=user_id,
        nudge_text=nudge_text,
        nudge_type="observational",
        delivered_at=datetime.utcnow(),
    )
    db.add(nudge)
    db.commit()
    db.refresh(nudge)
    return nudge


def generate_observational_nudge(
    db: Session, session_id: uuid.UUID, user_id: uuid.UUID
) -> str | None:
    """
    Analyze recent telemetry to produce a SINGLE observational nudge.
    Returns None if no pattern warrants a nudge, or if quota is exhausted.

    STRICT RULES:
    - Observational only: state measured facts, never interpret emotions
    - Maximum 2 per session (enforced by NudgeLimiter)
    """
    if not can_deliver_nudge(db, session_id):
        return None

    recent_answers = (
        db.query(UserAnswer)
        .filter(UserAnswer.session_id == session_id)
        .order_by(UserAnswer.answered_at.desc())
        .limit(ACCURACY_DROP_WINDOW)
        .all()
    )

    if len(recent_answers) < ACCURACY_DROP_WINDOW:
        return None

    recent_correct = sum(1 for a in recent_answers if a.is_correct)
    recent_accuracy = recent_correct / len(recent_answers)

    recent_times = [a.time_taken_seconds for a in recent_answers]
    avg_recent_time = sum(recent_times) / len(recent_times) if recent_times else 0

    all_answers = (
        db.query(UserAnswer)
        .filter(UserAnswer.session_id == session_id)
        .all()
    )
    all_times = [a.time_taken_seconds for a in all_answers]
    overall_avg_time = sum(all_times) / len(all_times) if all_times else 0

    # Pattern: Acceleration with accuracy drop
    if (
        recent_accuracy <= ACCURACY_DROP_THRESHOLD
        and overall_avg_time > 0
        and avg_recent_time < overall_avg_time * VELOCITY_THRESHOLD
    ):
        nudge_text = (
            "تُظهر البيانات تسارعاً ملحوظاً في الإجابة على آخر "
            f"{ACCURACY_DROP_WINDOW} أسئلة مع انخفاض في الدقة."
        )
        saved = record_nudge(db, session_id, user_id, nudge_text)
        return nudge_text if saved else None

    # Pattern: Consistent slow responses (possible overthinking)
    if (
        recent_accuracy <= ACCURACY_DROP_THRESHOLD
        and overall_avg_time > 0
        and avg_recent_time > overall_avg_time * 2.0
    ):
        nudge_text = (
            "تُظهر البيانات زيادة ملحوظة في وقت الإجابة على الأسئلة الأخيرة "
            "مع عدم تحسن في الدقة."
        )
        saved = record_nudge(db, session_id, user_id, nudge_text)
        return nudge_text if saved else None

    return None
