"""Appeals — a student's right to contest a grade. Opening one notifies the
teacher and writes an audit entry; resolving it is the human-review step."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, require_roles
from app.models import Appeal, Assignment, Notification, Submission, User
from app.schemas import AppealIn, AppealResolveIn
from app.serialize import appeal_out
from app.services.audit import audit_log

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
async def open_appeal(
    payload: AppealIn,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_user),
) -> dict:
    sub = await db.get(Submission, payload.submission_id)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "topshiriq topilmadi")
    if student.role == "student" and sub.student_id != student.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "faqat o'z bahosiga e'tiroz bildirasiz")

    existing = (
        await db.execute(
            select(Appeal).where(Appeal.submission_id == sub.id, Appeal.status == "open")
        )
    ).scalar_one_or_none()
    if existing:
        return appeal_out(existing)

    appeal = Appeal(submission_id=sub.id, student_id=sub.student_id, reason=payload.reason.strip())
    db.add(appeal)
    await db.flush()

    assignment = await db.get(Assignment, sub.assignment_id)
    if assignment:
        db.add(Notification(
            user_id=assignment.teacher_id,
            title="Yangi e'tiroz",
            body="O'quvchi baho bo'yicha e'tiroz bildirdi.",
            type="appeal",
            link="/teacher/appeals",
        ))
    db.add(audit_log(student.id, "appeal_opened", "appeal", appeal.id,
                     {"submission_id": sub.id, "reason": payload.reason.strip()[:160]}))
    await db.commit()
    await db.refresh(appeal)
    return appeal_out(appeal)


@router.get("")
async def list_appeals(
    submission_id: int | None = None,
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    q = select(Appeal).order_by(Appeal.status.asc(), Appeal.created_at.desc())  # open before resolved
    if user.role == "student":
        q = q.where(Appeal.student_id == user.id)
    elif user.role == "teacher":
        q = (
            q.join(Submission, Appeal.submission_id == Submission.id)
            .join(Assignment, Submission.assignment_id == Assignment.id)
            .where(Assignment.subject_id == user.subject_id)
        )
    if submission_id is not None:
        q = q.where(Appeal.submission_id == submission_id)
    if status_filter:
        q = q.where(Appeal.status == status_filter)

    rows = (await db.execute(q)).scalars().all()
    out = []
    for a in rows:
        s = await db.get(User, a.student_id)
        out.append(appeal_out(a, student_name=s.name if s else None))
    return out


@router.post("/{appeal_id}/resolve")
async def resolve_appeal(
    appeal_id: int,
    payload: AppealResolveIn,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_roles("teacher", "institution_admin", "superadmin")),
) -> dict:
    appeal = await db.get(Appeal, appeal_id)
    if not appeal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "e'tiroz topilmadi")
    appeal.status = "resolved"
    appeal.teacher_response = payload.teacher_response.strip()

    db.add(Notification(
        user_id=appeal.student_id,
        title="E'tirozingizga javob berildi",
        body="O'qituvchi e'tirozingizni ko'rib chiqdi.",
        type="appeal",
        link=f"/student/result/{appeal.submission_id}",
    ))
    db.add(audit_log(teacher.id, "appeal_resolved", "appeal", appeal.id,
                     {"response": payload.teacher_response.strip()[:160]}))
    await db.commit()
    await db.refresh(appeal)
    return appeal_out(appeal)
