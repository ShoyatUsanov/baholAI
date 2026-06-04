"""Submissions — student submits; auto + AI grading runs immediately."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user
from app.models import Assignment, Grade, Submission, User
from app.schemas import SubmissionIn
from app.serialize import submission_out
from app.services.grading import grade_submission

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit(
    payload: SubmissionIn,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_user),
) -> dict:
    assignment = await db.get(Assignment, payload.assignment_id)
    if not assignment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vazifa topilmadi")

    sub = Submission(
        assignment_id=assignment.id, student_id=student.id,
        answers=payload.answers, status="graded",
    )
    db.add(sub)
    await db.flush()  # get sub.id

    result = await grade_submission(assignment.questions or [], payload.answers or {})
    grade = Grade(
        submission_id=sub.id,
        objective_score=result["objective_score"],
        ai_score=result["ai_score"],
        total_score=result["total_score"],
        max_score=result["max_score"],
        breakdown=result["breakdown"],
        ai_provider=result["ai_provider"],
    )
    db.add(grade)
    # award XP proportional to percent
    if result["max_score"]:
        student.xp += round(result["total_score"] / result["max_score"] * 100)
    await db.commit()
    await db.refresh(sub)
    return submission_out(sub, grade)


@router.get("")
async def list_submissions(
    assignment_id: int | None = None,
    student_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    q = select(Submission).order_by(Submission.submitted_at.desc())
    if assignment_id:
        q = q.where(Submission.assignment_id == assignment_id)
    if student_id:
        q = q.where(Submission.student_id == student_id)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for s in rows:
        grade = (await db.execute(select(Grade).where(Grade.submission_id == s.id))).scalar_one_or_none()
        out.append(submission_out(s, grade))
    return out


@router.get("/{submission_id}")
async def get_submission(submission_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    s = await db.get(Submission, submission_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "topshiriq topilmadi")
    grade = (await db.execute(select(Grade).where(Grade.submission_id == s.id))).scalar_one_or_none()
    return submission_out(s, grade)
