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
    # Optional grading rubric for open answers: [{criterion, max_points, description}].
    rubric: Mapped[list] = mapped_column(JSON, default=list)
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
    originality: Mapped["OriginalityReport | None"] = relationship(
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
    # Explainable AI grading: each point tied to a rubric criterion + evidence.
    rubric_breakdown: Mapped[list] = mapped_column(JSON, default=list)
    confidence: Mapped[int] = mapped_column(Integer, default=100)         # 0..100
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False)    # low confidence
    # Human-in-the-loop: AI grades land as a draft until a teacher approves.
    status: Mapped[str] = mapped_column(String(12), default="approved")   # pending|approved
    # ai_score above keeps the ORIGINAL AI estimate; when a teacher overrides the
    # score we update total_score and flag this, so the diff stays auditable.
    was_changed: Mapped[bool] = mapped_column(Boolean, default=False)
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


class OriginalityReport(Base):
    """Originality signal for one submission — a hint for the teacher, never an
    automatic penalty.

    `similarity` is the highest text overlap with another submission of the same
    assignment (group copy-paste); `ai_likelihood` is a rule-based proxy for the
    answer reading as machine-written. `flagged` just raises the teacher's
    attention — the final judgement is always the teacher's.
    """

    __tablename__ = "originality_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("submissions.id"), unique=True, index=True
    )
    similarity: Mapped[int] = mapped_column(Integer, default=0)          # 0..100
    ai_likelihood: Mapped[int] = mapped_column(Integer, default=0)       # 0..100
    matched_submission_ids: Mapped[list] = mapped_column(JSON, default=list)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    submission: Mapped[Submission] = relationship(back_populates="originality")


# ===========================================================================
# Learning content — per-subject collections (to'plamlar), lessons, decks,
# flashcards (with per-student SM-2 progress) and self-study tests.
# ===========================================================================
class Collection(Base):
    """A themed set (to'plam) of lessons within a subject."""

    __tablename__ = "collections"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(16), default="📚")
    level: Mapped[str | None] = mapped_column(String(40), nullable=True)
    order_idx: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Lesson(Base):
    """A lesson inside a collection: content + inline practice exercises."""

    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    collection_id: Mapped[int] = mapped_column(ForeignKey("collections.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="")
    est_minutes: Mapped[int] = mapped_column(Integer, default=10)
    exercises: Mapped[list] = mapped_column(JSON, default=list)  # same question schema as assignments
    order_idx: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Deck(Base):
    __tablename__ = "decks"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), index=True)
    collection_id: Mapped[int | None] = mapped_column(ForeignKey("collections.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(primary_key=True)
    deck_id: Mapped[int] = mapped_column(ForeignKey("decks.id"), index=True)
    front: Mapped[str] = mapped_column(Text)
    back: Mapped[str] = mapped_column(Text)
    example: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_idx: Mapped[int] = mapped_column(Integer, default=0)


class CardProgress(Base):
    """Per-student SM-2 spaced-repetition state for a flashcard."""

    __tablename__ = "card_progress"

    id: Mapped[int] = mapped_column(primary_key=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("flashcards.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    easiness: Mapped[float] = mapped_column(Float, default=2.5)
    interval: Mapped[int] = mapped_column(Integer, default=0)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review: Mapped[datetime] = mapped_column(DateTime, default=now)
    status: Mapped[str] = mapped_column(String(12), default="new")  # new|learning|known


class Test(Base):
    """Self-study test / quiz (mirrors assignment questions, timed)."""

    __tablename__ = "tests"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), index=True)
    collection_id: Mapped[int | None] = mapped_column(ForeignKey("collections.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=10)
    questions: Mapped[list] = mapped_column(JSON, default=list)
    is_final: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class TestResult(Base):
    __tablename__ = "test_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("tests.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)
    time_spent: Mapped[int] = mapped_column(Integer, default=0)
    wrong: Mapped[list] = mapped_column(JSON, default=list)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=now)


# ===========================================================================
# Operational modules — groups, schedule, attendance, payments, messaging.
# ===========================================================================
class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"), nullable=True)
    level: Mapped[str | None] = mapped_column(String(40), nullable=True)
    member_ids: Mapped[list] = mapped_column(JSON, default=list)
    days: Mapped[list] = mapped_column(JSON, default=list)  # [1..7]
    start_time: Mapped[str | None] = mapped_column(String(8), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(8), nullable=True)
    room: Mapped[str | None] = mapped_column(String(40), nullable=True)
    monthly_fee: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("groups.id"), nullable=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(160))
    day_of_week: Mapped[int] = mapped_column(Integer, default=1)  # 1=Mon..7=Sun
    start_time: Mapped[str] = mapped_column(String(8), default="09:00")
    end_time: Mapped[str] = mapped_column(String(8), default="10:00")
    room: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    group_id: Mapped[int | None] = mapped_column(ForeignKey("groups.id"), nullable=True)
    date: Mapped[str] = mapped_column(String(10))  # YYYY-MM-DD
    status: Mapped[str] = mapped_column(String(10), default="present")  # present|absent|late|excused
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    marked_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(8), default="UZS")
    period: Mapped[str] = mapped_column(String(20))  # e.g. 2026-06
    status: Mapped[str] = mapped_column(String(10), default="pending")  # paid|pending|overdue
    group_id: Mapped[int | None] = mapped_column(ForeignKey("groups.id"), nullable=True)
    # Subscription payments (vs group tuition).
    plan_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    billing_cycle: Mapped[str | None] = mapped_column(String(10), nullable=True)  # monthly|yearly
    method: Mapped[str] = mapped_column(String(20), default="mock")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Plan(Base):
    """A subscription tier (free/medium/premium) — admin-editable price + features."""

    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # free|medium|premium
    name: Mapped[str] = mapped_column(String(60))
    price_monthly: Mapped[int] = mapped_column(Integer, default=0)  # so'm
    price_yearly: Mapped[int] = mapped_column(Integer, default=0)
    features: Mapped[dict] = mapped_column(JSON, default=dict)
    order_idx: Mapped[int] = mapped_column(Integer, default=0)


class Subscription(Base):
    """A user's current subscription. Absence = free tier."""

    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    plan_code: Mapped[str] = mapped_column(String(20), default="free")
    billing_cycle: Mapped[str] = mapped_column(String(10), default="monthly")  # monthly|yearly
    status: Mapped[str] = mapped_column(String(12), default="active")  # active|expired|canceled
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    to_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    audience: Mapped[str] = mapped_column(String(20), default="all")  # all|students|teachers
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(20), default="info")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    link: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(20))  # lesson|test|flashcards|assignment|...
    title: Mapped[str] = mapped_column(String(200))
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


# ===========================================================================
# Trust & compliance — an immutable audit trail of every grading decision and a
# student's right to contest a grade (Uzbek "Shaxsga doir ma'lumotlar" law).
# ===========================================================================
class AuditLog(Base):
    """Append-only record of grading decisions. user_id is null for AI/system
    actions; detail keeps the old/new values so a decision is fully auditable."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(32), index=True)
    # ai_graded | teacher_edited | approved | appeal_opened | appeal_resolved
    entity_type: Mapped[str] = mapped_column(String(32), default="submission")
    entity_id: Mapped[int] = mapped_column(Integer, index=True)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Appeal(Base):
    """A student's appeal against a grade. Resolving it is the human-review step."""

    __tablename__ = "appeals"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(12), default="open")  # open|resolved
    teacher_response: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    "OriginalityReport",
    "Collection",
    "Lesson",
    "Deck",
    "Flashcard",
    "CardProgress",
    "Test",
    "TestResult",
    "Group",
    "ScheduleEntry",
    "Attendance",
    "Payment",
    "Message",
    "Announcement",
    "Notification",
    "Activity",
    "AuditLog",
    "Appeal",
    "Plan",
    "Subscription",
    "now",
]
