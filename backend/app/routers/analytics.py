"""Analytics — student / subject / overview views."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services import analytics as svc

router = APIRouter()


@router.get("/student/{student_id}")
async def student(student_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    return await svc.student_analytics(db, student_id)


@router.get("/subject/{subject_id}")
async def subject(subject_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    return await svc.subject_analytics(db, subject_id)


@router.get("/overview")
async def overview(db: AsyncSession = Depends(get_db)) -> dict:
    return await svc.overview(db)


@router.get("/assignments")
async def assignments(teacher_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """Teacher view: completion + average score per created assignment."""
    return await svc.assignment_progress(db, teacher_id)


@router.get("/students")
async def students(subject_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """Teacher view: roster of students with their engagement in the subject."""
    return await svc.teacher_students(db, subject_id)
