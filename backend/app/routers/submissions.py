"""Submissions — student submits; auto + AI grading runs immediately."""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, require_roles
from app.models import AuditLog, Assignment, Grade, OriginalityReport, Session, Submission, User
from app.originality import build_report
from app.schemas import GradeOverrideIn, SubmissionIn
from app.serialize import audit_out, originality_out, submission_out
from app.services.audit import audit_log
from app.services.billing import ai_graded_this_month, current_features, require_feature
from app.services.grading import grade_submission
from app.services.notify import create_notification

router = APIRouter()


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit(
    payload: SubmissionIn,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_user),
) -> dict:
    assignment = await db.get(Assignment, payload.assignment_id)
    if not assignment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vazifa topilmadi")

    # Feature gate: Free tier has a monthly AI-grading quota.
    feats = await current_features(db, student.id)
    has_ai = any(
        q.get("ai_graded") or q.get("type") in ("short", "essay") for q in (assignment.questions or [])
    )
    if has_ai:
        limit = feats.get("ai_grading_limit")
        if limit is not None and await ai_graded_this_month(db, student.id) >= limit:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Free tarifda oyiga {limit} ta AI baholash mavjud. Tarifni yangilang.",
            )

    sub = Submission(
        assignment_id=assignment.id, student_id=student.id,
        answers=payload.answers, status="graded",
    )
    db.add(sub)
    await db.flush()  # get sub.id

    result = await grade_submission(
        assignment.questions or [], payload.answers or {}, assignment.rubric or [],
        db=db, assignment_id=assignment.id,
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
        # AI-graded (open) answers land as a draft awaiting teacher approval.
        status="pending" if result["rubric_breakdown"] else "approved",
    )
    db.add(grade)
    # award XP proportional to percent — gated by plan (Free: no XP rewards).
    if result["max_score"] and feats.get("xp_rewards"):
        pct = round(result["total_score"] / result["max_score"] * 100)
        student.xp += pct * int(feats.get("xp_multiplier", 1) or 1)

    # Audit trail: the AI made a grading decision (user_id null = AI/system).
    db.add(audit_log(None, "ai_graded", "submission", sub.id, {
        "ai_score": result["ai_score"], "total_score": result["total_score"],
        "confidence": result["confidence"],
    }))

    # Low-confidence AI grade → ask the teacher to review.
    if result["needs_review"]:
        create_notification(
            db, assignment.teacher_id, "grade", "Ko'rib chiqish kerak",
            body="AI past ishonch bilan baholadi — tasdiqlang.", link="/teacher/grading",
        )

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
async def submission_originality(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Originality signal for a submission (teacher view). Built on demand if
    missing. A SIGNAL only — the teacher makes the final call. Plagiarism is a
    paid feature, so the viewer's plan is checked."""
    await require_feature(db, user.id, "plagiarism")
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


@router.get("/{submission_id}/grade-stream")
async def grade_stream(
    submission_id: int,
    token: str = "",
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Replay a submission's grade as Server-Sent Events for the live "jonly
    baholash" animation. Auth via ?token= because EventSource can't set headers.
    All data is read up-front so the generator never touches the DB session."""
    if not token or not await db.get(Session, token):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token kerak")
    sub = await db.get(Submission, submission_id)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "topshiriq topilmadi")
    grade = (await db.execute(select(Grade).where(Grade.submission_id == sub.id))).scalar_one_or_none()
    report = (
        await db.execute(select(OriginalityReport).where(OriginalityReport.submission_id == sub.id))
    ).scalar_one_or_none()

    criteria = list((grade.rubric_breakdown if grade else None) or [])
    originality = {
        "similarity": report.similarity if report else 0,
        "ai_likelihood": report.ai_likelihood if report else 0,
    }
    confidence = {
        "confidence": grade.confidence if grade else 0,
        "needs_review": grade.needs_review if grade else False,
    }
    done = {
        "total": round(sum(float(c.get("points_given", 0) or 0) for c in criteria), 1),
        "max_total": round(sum(float(c.get("max_points", 0) or 0) for c in criteria), 1),
        "score": grade.total_score if grade else 0,
        "max_score": grade.max_score if grade else 0,
        "percent": round(grade.total_score / grade.max_score * 100) if grade and grade.max_score else 0,
        "status": grade.status if grade else "approved",
    }

    async def event_gen():
        try:
            for c in criteria:
                yield _sse("criterion", {
                    "criterion": c.get("criterion"),
                    "points_given": c.get("points_given"),
                    "max_points": c.get("max_points"),
                })
                await asyncio.sleep(0.4)
            yield _sse("originality", originality)
            await asyncio.sleep(0.4)
            yield _sse("confidence", confidence)
            await asyncio.sleep(0.4)
            yield _sse("done", done)
        except asyncio.CancelledError:  # client closed the EventSource
            return

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.post("/{submission_id}/grade/approve")
async def approve_grade(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_roles("teacher", "institution_admin", "superadmin")),
) -> dict:
    """Teacher approves a draft AI grade — it then becomes visible to the student."""
    grade = (
        await db.execute(select(Grade).where(Grade.submission_id == submission_id))
    ).scalar_one_or_none()
    if not grade:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "baho topilmadi")
    grade.status = "approved"
    db.add(audit_log(teacher.id, "approved", "submission", submission_id, {
        "total_score": grade.total_score, "max_score": grade.max_score,
    }))
    sub = await db.get(Submission, submission_id)
    if sub:
        create_notification(
            db, sub.student_id, "grade", "Bahongiz tayyor",
            body="O'qituvchi bahoyingizni tasdiqladi.", link=f"/student/result/{submission_id}",
        )
    await db.commit()
    return {"submission_id": submission_id, "status": "approved"}


@router.get("/{submission_id}/audit")
async def submission_audit(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    """Decision journal for a submission — every AI/teacher action, transparent
    to the student ("qora quti emas")."""
    rows = (
        await db.execute(
            select(AuditLog)
            .where(AuditLog.entity_type == "submission", AuditLog.entity_id == submission_id)
            .order_by(AuditLog.created_at.asc())
        )
    ).scalars().all()
    out = []
    for a in rows:
        actor = await db.get(User, a.user_id) if a.user_id else None
        out.append(audit_out(a, user_name=actor.name if actor else None))
    return out


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

    old_ai = round(grade.total_score - grade.objective_score, 1)
    new_ai = max(0.0, min(payload.ai_score, grade.max_score - grade.objective_score))
    grade.total_score = round(grade.objective_score + new_ai, 1)
    grade.was_changed = True
    grade.needs_review = False  # a human has now reviewed it
    db.add(audit_log(teacher.id, "teacher_edited", "submission", s.id, {
        "old_ai": old_ai, "new_ai": round(new_ai, 1), "ai_suggested": grade.ai_score,
    }))
    # award XP delta is out of scope; analytics read total_score directly.
    await db.commit()
    await db.refresh(s)
    report = (
        await db.execute(select(OriginalityReport).where(OriginalityReport.submission_id == s.id))
    ).scalar_one_or_none()
    return submission_out(s, grade, report)
