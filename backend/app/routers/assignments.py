"""Assignments (vazifalar) — teacher creates; students/teachers list."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, require_roles
from app.models import Assignment, Subject, User
from app.schemas import AssignmentIn
from app.serialize import assignment_out
from app.services.methods import is_valid_method

router = APIRouter()


@router.get("")
async def list_assignments(
    subject_id: int | None = None,
    teacher_id: int | None = None,
    student_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    q = select(Assignment).order_by(Assignment.created_at.desc())
    if subject_id:
        q = q.where(Assignment.subject_id == subject_id)
    if teacher_id:
        q = q.where(Assignment.teacher_id == teacher_id)
    rows = (await db.execute(q)).scalars().all()
    if student_id:
        # A student sees assignments addressed to everyone or to them specifically.
        rows = [a for a in rows if not a.target_student_ids or student_id in a.target_student_ids]
    return [assignment_out(a) for a in rows]


@router.get("/{assignment_id}")
async def get_assignment(assignment_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    a = await db.get(Assignment, assignment_id)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "vazifa topilmadi")
    return assignment_out(a)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_assignment(
    payload: AssignmentIn,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_roles("teacher", "institution_admin", "superadmin")),
) -> dict:
    if not await db.get(Subject, payload.subject_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "fan topilmadi")
    if not is_valid_method(payload.method):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "noto'g'ri interaktiv usul")
    a = Assignment(
        subject_id=payload.subject_id,
        teacher_id=teacher.id,
        institution_id=teacher.institution_id,
        title=payload.title,
        description=payload.description,
        method=payload.method,
        questions=payload.questions,
        target_student_ids=payload.target_student_ids,
        due_at=payload.due_at,
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return assignment_out(a)
