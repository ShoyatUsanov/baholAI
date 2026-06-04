"""Submissions — student submits; auto + AI grading runs immediately."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, require_roles
from app.models import Assignment, Grade, OriginalityReport, Submission, User
from app.originality import build_report
from app.schemas import GradeOverrideIn, SubmissionIn
from app.serialize import originality_out, submission_out
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

    result = await grade_submission(
        assignment.questions or [], payload.answers or {}, assignment.rubric or [],
    )
    grade = Grade(
        submission_id=sub.id,
        objective_score=result["objective_score"],
        ai_score=result["ai_score"],
        total_score=result["total_score"],
        max_score=result["max_score"],
        breakdown=result["breakdown"],
        ai_provider=result["ai_provider"],
        rubric_breakdown=result["rubric_breakdown"],
        confidence=result["confidence"],
        needs_review=result["needs_review"],
    )
    db.add(grade)
    # award XP proportional to percent
    if result["max_score"]:
        student.xp += round(result["total_score"] / result["max_score"] * 100)

    # Originality signal for the teacher (auto, never a penalty). A new
    # submission can also change a peer's similarity, so refresh matched ones.
    report = await build_report(sub.id, db)
    for mid in (report.matched_submission_ids if report else []):
        await build_report(mid, db)

    await db.commit()
    await db.refresh(sub)
    return submission_out(sub, grade, report)


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
        report = (
            await db.execute(select(OriginalityReport).where(OriginalityReport.submission_id == s.id))
        ).scalar_one_or_none()
        out.append(submission_out(s, grade, report))
    return out


@router.get("/{submission_id}")
async def get_submission(submission_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    s = await db.get(Submission, submission_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "topshiriq topilmadi")
    grade = (await db.execute(select(Grade).where(Grade.submission_id == s.id))).scalar_one_or_none()
    report = (
        await db.execute(select(OriginalityReport).where(OriginalityReport.submission_id == s.id))
    ).scalar_one_or_none()
    return submission_out(s, grade, report)


@router.get("/{submission_id}/originality")
async def submission_originality(submission_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """Originality signal for a submission (teacher view). Built on demand if
    missing. A SIGNAL only — the teacher makes the final call."""
    s = await db.get(Submission, submission_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "topshiriq topilmadi")
    report = (
        await db.execute(select(OriginalityReport).where(OriginalityReport.submission_id == s.id))
    ).scalar_one_or_none()
    if report is None:
        report = await build_report(s.id, db)
        await db.commit()
    return originality_out(report)


@router.patch("/{submission_id}/grade")
async def override_grade(
    submission_id: int,
    payload: GradeOverrideIn,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_roles("teacher", "institution_admin", "superadmin")),
) -> dict:
    """Teacher overrides the AI portion of a grade. The original ai_score is kept
    and was_changed is flagged, so the AI-vs-human diff stays auditable."""
    s = await db.get(Submission, submission_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "topshiriq topilmadi")
    grade = (await db.execute(select(Grade).where(Grade.submission_id == s.id))).scalar_one_or_none()
    if not grade:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "baho topilmadi")

    new_ai = max(0.0, min(payload.ai_score, grade.max_score - grade.objective_score))
    grade.total_score = round(grade.objective_score + new_ai, 1)
    grade.was_changed = True
    grade.needs_review = False  # a human has now reviewed it
    # award XP delta is out of scope; analytics read total_score directly.
    await db.commit()
    await db.refresh(s)
    report = (
        await db.execute(select(OriginalityReport).where(OriginalityReport.submission_id == s.id))
    ).scalar_one_or_none()
    return submission_out(s, grade, report)
