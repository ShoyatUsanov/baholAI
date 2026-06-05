"""Request/response schemas (Pydantic)."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class LoginIn(BaseModel):
    username: str
    password: str


class RegisterIn(BaseModel):
    name: str
    username: str
    password: str
    email: str | None = None  # collected for UX; not persisted in basic mode
    role: str = "student"      # student | teacher (admin can't self-register)


class InstitutionIn(BaseModel):
    name: str
    kind: str = "university"
    region: str | None = None


class SubjectIn(BaseModel):
    name: str
    slug: str | None = None
    icon: str = "📘"
    color: str = "#6366f1"
    description: str | None = None


class UserCreateIn(BaseModel):
    role: str  # teacher | student | institution_admin
    name: str
    username: str
    password: str
    institution_id: int | None = None
    subject_id: int | None = None
    level: str | None = None


class AssignmentIn(BaseModel):
    subject_id: int
    title: str
    description: str | None = None
    method: str = "standard"
    questions: list[dict[str, Any]] = []
    rubric: list[dict[str, Any]] = []
    target_student_ids: list[int] = []
    due_at: datetime | None = None


class SubmissionIn(BaseModel):
    assignment_id: int
    answers: dict[str, Any] = {}


class GradeOverrideIn(BaseModel):
    """Teacher adjusts the AI portion of a grade; the original ai_score is kept."""

    ai_score: float


class AppealIn(BaseModel):
    submission_id: int
    reason: str


class AppealResolveIn(BaseModel):
    teacher_response: str


class SubscribeIn(BaseModel):
    plan_code: str
    billing_cycle: str = "monthly"  # monthly | yearly


class PlanUpdateIn(BaseModel):
    price_monthly: int | None = None
    price_yearly: int | None = None
    features: dict[str, Any] | None = None


class FingerprintIn(BaseModel):
    assignment_id: int
    question_index: int = 0
    label: str
    canonical_text: str
    suggested_points: float = 0
    suggested_feedback: str = ""


class FeedbackIn(BaseModel):
    submission_id: int
    rating: int = 5
    comment: str | None = None


class ApiKeyIn(BaseModel):
    label: str
    institution_id: int | None = None
    scopes: list[str] = ["read:subjects", "read:analytics"]


class CollectionIn(BaseModel):
    subject_id: int
    title: str
    description: str | None = None
    icon: str = "📚"
    level: str | None = None


class LessonIn(BaseModel):
    collection_id: int
    title: str
    content: str = ""
    est_minutes: int = 10
    exercises: list[dict[str, Any]] = []


class DeckIn(BaseModel):
    subject_id: int
    collection_id: int | None = None
    title: str
    description: str | None = None
    cards: list[dict[str, Any]] = []  # {front, back, example?}


class TestIn(BaseModel):
    subject_id: int
    collection_id: int | None = None
    title: str
    duration_minutes: int = 10
    is_final: bool = False
    questions: list[dict[str, Any]] = []


class TestSubmitIn(BaseModel):
    answers: dict[str, Any] = {}
    time_spent: int = 0


class CardReviewIn(BaseModel):
    quality: int = 4  # 0..5


class GroupIn(BaseModel):
    name: str
    subject_id: int | None = None
    level: str | None = None
    member_ids: list[int] = []
    days: list[int] = []
    start_time: str | None = None
    end_time: str | None = None
    room: str | None = None
    monthly_fee: int = 0


class ScheduleIn(BaseModel):
    group_id: int | None = None
    subject_id: int | None = None
    title: str
    day_of_week: int = 1
    start_time: str = "09:00"
    end_time: str = "10:00"
    room: str | None = None


class AttendanceIn(BaseModel):
    student_id: int
    group_id: int | None = None
    date: str
    status: str = "present"
    note: str | None = None


class PaymentIn(BaseModel):
    student_id: int
    amount: int
    currency: str = "UZS"
    period: str
    status: str = "pending"
    group_id: int | None = None


class MessageIn(BaseModel):
    to_id: int
    body: str


class AnnouncementIn(BaseModel):
    title: str
    body: str
    audience: str = "all"


class AiGradeIn(BaseModel):
    prompt: str
    model_answer: str = ""
    student_answer: str = ""
    max_score: float = 10.0


class AiFeedbackIn(BaseModel):
    student_name: str
    subject: str
    score_pct: int
    weak_points: list[str] = []
