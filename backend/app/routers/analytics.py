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
