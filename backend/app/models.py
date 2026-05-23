import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QDifficulty(enum.Enum):
    EASY = "سهل"
    MEDIUM = "متوسط"
    HARD = "صعب"


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    skill_category: Mapped[str] = mapped_column(String(100), nullable=False)
    difficulty: Mapped[QDifficulty] = mapped_column(
        Enum(QDifficulty, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    expected_time_seconds: Mapped[int] = mapped_column(Integer, nullable=False)

    choices: Mapped[list["QuestionChoice"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )


class QuestionChoice(Base):
    __tablename__ = "question_choices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    choice_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)

    question: Mapped["Question"] = relationship(back_populates="choices")


class UserAnswer(Base):
    __tablename__ = "user_answers"
    __table_args__ = (
        Index("idx_answers_session", "session_id"),
        Index("idx_answers_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questions.id"), nullable=False
    )
    chosen_choice_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("question_choices.id"), nullable=False
    )
    time_taken_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class MasteryNode(Base):
    __tablename__ = "mastery_nodes"
    __table_args__ = (
        UniqueConstraint("user_id", "skill_category", "sub_skill"),
        CheckConstraint("mastery_level >= 0.0 AND mastery_level <= 1.0"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    skill_category: Mapped[str] = mapped_column(String(100), nullable=False)
    sub_skill: Mapped[str] = mapped_column(String(150), nullable=False)
    mastery_level: Mapped[float] = mapped_column(Float, default=0.0)
    total_attempts: Mapped[int] = mapped_column(Integer, default=0)
    correct_attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class MasteryEdge(Base):
    __tablename__ = "mastery_edges"
    __table_args__ = (
        UniqueConstraint("user_id", "source_node_id", "target_node_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    source_node_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("mastery_nodes.id", ondelete="CASCADE"), nullable=False
    )
    target_node_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("mastery_nodes.id", ondelete="CASCADE"), nullable=False
    )
    weight: Mapped[float] = mapped_column(Float, default=0.5)


class SessionNudge(Base):
    __tablename__ = "session_nudges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    nudge_text: Mapped[str] = mapped_column(Text, nullable=False)
    nudge_type: Mapped[str] = mapped_column(String(50), default="observational")
    delivered_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class AnswerTelemetry(Base):
    __tablename__ = "answer_telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_answer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user_answers.id", ondelete="CASCADE"), nullable=False
    )
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    response_velocity: Mapped[float | None] = mapped_column(Float, nullable=True)
    time_deviation_from_expected: Mapped[float | None] = mapped_column(Float, nullable=True)
    difficulty_at_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    streak_count: Mapped[int] = mapped_column(Integer, default=0)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
