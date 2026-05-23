import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
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
