"""Feedback — teacher writes it on a submission; student reads it (and it feeds
the student's analytics). Includes seen/unseen tracking."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, require_roles
from app.models import Assignment, Feedback, Submission, User
from app.schemas import FeedbackIn
from app.serialize import feedback_out

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_feedback(
    payload: FeedbackIn,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_roles("teacher", "institution_admin", "superadmin")),
) -> dict:
    sub = await db.get(Submission, payload.submission_id)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "topshiriq topilmadi")
    assignment = await db.get(Assignment, sub.assignment_id)
    fb = Feedback(
        submission_id=sub.id,
        teacher_id=teacher.id,
        student_id=sub.student_id,
        subject_id=assignment.subject_id,
        rating=max(1, min(5, payload.rating)),
        comment=payload.comment,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return feedback_out(fb)


@router.get("")
async def list_feedback(
    student_id: int | None = None,
    submission_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    q = select(Feedback).order_by(Feedback.created_at.desc())
    if student_id:
        q = q.where(Feedback.student_id == student_id)
    if submission_id:
        q = q.where(Feedback.submission_id == submission_id)
    rows = (await db.execute(q)).scalars().all()
    return [feedback_out(f) for f in rows]


@router.post("/{feedback_id}/seen")
async def mark_seen(
    feedback_id: int,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_user),
) -> dict:
    fb = await db.get(Feedback, feedback_id)
    if not fb:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "feedback topilmadi")
    fb.seen_by_student = True
    await db.commit()
    return {"id": feedback_id, "seen_by_student": True}
