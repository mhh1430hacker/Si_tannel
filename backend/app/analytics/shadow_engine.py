"""
Shadow Engine: Background Psychometric Worker.
Runs AFTER the response is sent to the student.
Never blocks the test flow. Intelligence is felt, not announced.
"""

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    AnswerTelemetry,
    MasteryEdge,
    MasteryNode,
    Question,
    UserAnswer,
)


def psychometric_shadow_worker(session_id: str) -> None:
    """
    Background task executed after each answer submission.
    Computes telemetry metrics and updates mastery constellation.
    Designed to gracefully fail without affecting the test engine.
    """
    db = SessionLocal()
    try:
        sid = uuid.UUID(session_id)
        _compute_answer_telemetry(db, sid)
        _update_mastery_nodes(db, sid)
    except Exception:
        db.rollback()
    finally:
        db.close()


def _compute_answer_telemetry(db: Session, session_id: uuid.UUID) -> None:
    """Compute velocity and deviation metrics for the latest answer."""
    latest_answer = (
        db.query(UserAnswer)
        .filter(UserAnswer.session_id == session_id)
        .order_by(UserAnswer.answered_at.desc())
        .first()
    )
    if not latest_answer:
        return

    existing = (
        db.query(AnswerTelemetry)
        .filter(AnswerTelemetry.user_answer_id == latest_answer.id)
        .first()
    )
    if existing:
        return

    question = (
        db.query(Question)
        .filter(Question.id == latest_answer.question_id)
        .first()
    )
    if not question:
        return

    expected = question.expected_time_seconds
    actual = latest_answer.time_taken_seconds
    velocity = actual / expected if expected > 0 else 1.0
    deviation = actual - expected

    # Calculate streak
    session_answers = (
        db.query(UserAnswer)
        .filter(UserAnswer.session_id == session_id)
        .order_by(UserAnswer.answered_at.desc())
        .all()
    )

    streak = 0
    latest_correct = latest_answer.is_correct
    for ans in session_answers:
        if ans.is_correct == latest_correct:
            streak += 1
        else:
            break

    telemetry = AnswerTelemetry(
        user_answer_id=latest_answer.id,
        session_id=session_id,
        response_velocity=velocity,
        time_deviation_from_expected=float(deviation),
        difficulty_at_time=question.difficulty.value,
        streak_count=streak,
        computed_at=datetime.utcnow(),
    )
    db.add(telemetry)
    db.commit()


def _update_mastery_nodes(db: Session, session_id: uuid.UUID) -> None:
    """
    Update mastery constellation nodes based on session performance.
    Only updates node levels — visual state update happens on session completion
    or nightly CRON (Slow UX principle).
    """
    latest_answer = (
        db.query(UserAnswer)
        .filter(UserAnswer.session_id == session_id)
        .order_by(UserAnswer.answered_at.desc())
        .first()
    )
    if not latest_answer:
        return

    question = (
        db.query(Question)
        .filter(Question.id == latest_answer.question_id)
        .first()
    )
    if not question:
        return

    user_id = latest_answer.user_id
    category = question.skill_category
    sub_skill = category

    node = (
        db.query(MasteryNode)
        .filter(
            MasteryNode.user_id == user_id,
            MasteryNode.skill_category == category,
            MasteryNode.sub_skill == sub_skill,
        )
        .first()
    )

    if not node:
        node = MasteryNode(
            user_id=user_id,
            skill_category=category,
            sub_skill=sub_skill,
            mastery_level=0.0,
            total_attempts=0,
            correct_attempts=0,
        )
        db.add(node)

    node.total_attempts += 1
    if latest_answer.is_correct:
        node.correct_attempts += 1

    # EMA-style mastery update (exponential moving average)
    alpha = 0.3
    outcome = 1.0 if latest_answer.is_correct else 0.0
    node.mastery_level = alpha * outcome + (1 - alpha) * node.mastery_level
    node.last_updated_at = datetime.utcnow()

    db.commit()

    # Create edges between nodes in same category if multiple sub-skills exist
    _ensure_edges(db, user_id, node)


def _ensure_edges(db: Session, user_id: uuid.UUID, current_node: MasteryNode) -> None:
    """Create edges between nodes of the same user to form the constellation."""
    other_nodes = (
        db.query(MasteryNode)
        .filter(
            MasteryNode.user_id == user_id,
            MasteryNode.id != current_node.id,
        )
        .all()
    )

    for other in other_nodes:
        existing = (
            db.query(MasteryEdge)
            .filter(
                MasteryEdge.user_id == user_id,
                MasteryEdge.source_node_id == current_node.id,
                MasteryEdge.target_node_id == other.id,
            )
            .first()
        )
        if not existing:
            edge = MasteryEdge(
                user_id=user_id,
                source_node_id=current_node.id,
                target_node_id=other.id,
                weight=0.5,
            )
            db.add(edge)

    db.commit()
