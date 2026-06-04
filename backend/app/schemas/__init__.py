"""Request/response schemas (Pydantic)."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class LoginIn(BaseModel):
    username: str
    password: str


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
    target_student_ids: list[int] = []
    due_at: datetime | None = None


class SubmissionIn(BaseModel):
    assignment_id: int
    answers: dict[str, Any] = {}


class FeedbackIn(BaseModel):
    submission_id: int
    rating: int = 5
    comment: str | None = None


class ApiKeyIn(BaseModel):
    label: str
    institution_id: int | None = None
    scopes: list[str] = ["read:subjects", "read:analytics"]


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
