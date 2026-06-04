"""Database models for baholAI.

Domain is subject-agnostic: a Subject (fan) is a first-class entity and every
teacher, assignment and analytic is scoped to one. English is just one row in
the subjects table — Mathematics, Physics, etc. are identical in capability.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


# Roles: superadmin | institution_admin | teacher | student
class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(40), default="university")  # university|school|college|center
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Subject(Base):
    """A teaching subject (fan). Subject-agnostic core lives on this table."""

    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    icon: Mapped[str] = mapped_column(String(16), default="📘")
    color: Mapped[str] = mapped_column(String(16), default="#6366f1")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(24), index=True)
    name: Mapped[str] = mapped_column(String(200))
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(200))  # plaintext for basic demo only
    institution_id: Mapped[int | None] = mapped_column(ForeignKey("institutions.id"), nullable=True)
    # For teachers: the subject they teach. Students are subject-agnostic.
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"), nullable=True)
    level: Mapped[str | None] = mapped_column(String(40), nullable=True)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Session(Base):
    """Opaque bearer token (basic auth — no JWT)."""

    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class ApiKey(Base):
    """Per-institution API key for external integrations (admin-issued)."""

    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(120))
    institution_id: Mapped[int | None] = mapped_column(ForeignKey("institutions.id"), nullable=True)
    scopes: Mapped[list] = mapped_column(JSON, default=list)  # e.g. ["read:subjects","read:analytics"]
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Assignment(Base):
    """A piece of work a teacher gives. Questions are JSON, mixed types.

    Each question carries `ai_graded: bool`. Objective questions (mcq, fill,
    truefalse, match, reorder) are scored deterministically; `ai_graded`
    questions (short, essay) are routed to the AI section.
    """

    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    institution_id: Mapped[int | None] = mapped_column(ForeignKey("institutions.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(240))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Modern/interactive teaching method tag (see services.methods).
    method: Mapped[str] = mapped_column(String(40), default="standard")
    questions: Mapped[list] = mapped_column(JSON, default=list)
    target_student_ids: Mapped[list] = mapped_column(JSON, default=list)  # empty = all students
    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("assignments.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)  # {question_id: response}
    status: Mapped[str] = mapped_column(String(20), default="submitted")
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    grade: Mapped["Grade | None"] = relationship(
        back_populates="submission", uselist=False, cascade="all, delete-orphan"
    )


class Grade(Base):
    """Combined grade. Objective + AI parts kept separate and transparent."""

    __tablename__ = "grades"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), unique=True, index=True)
    objective_score: Mapped[float] = mapped_column(Float, default=0.0)
    ai_score: Mapped[float] = mapped_column(Float, default=0.0)
    total_score: Mapped[float] = mapped_column(Float, default=0.0)
    max_score: Mapped[float] = mapped_column(Float, default=0.0)
    # Per-question breakdown incl. AI rationale + suggestions (Uzbek).
    breakdown: Mapped[list] = mapped_column(JSON, default=list)
    ai_provider: Mapped[str] = mapped_column(String(24), default="fallback")  # ollama|fallback
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    submission: Mapped[Submission] = relationship(back_populates="grade")


class Feedback(Base):
    """Teacher feedback on a submission. The student sees it and it feeds the
    student's analytics (avg rating per subject)."""

    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), index=True)
    rating: Mapped[int] = mapped_column(Integer, default=5)  # 1..5
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    seen_by_student: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


__all__ = [
    "Institution",
    "Subject",
    "User",
    "Session",
    "ApiKey",
    "Assignment",
    "Submission",
    "Grade",
    "Feedback",
    "now",
]
