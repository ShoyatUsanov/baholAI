"""Lightweight authenticated user directory (names only) — lets teachers and
students resolve people for groups, attendance, payments and messaging without
the admin-only surface."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user
from app.models import User

router = APIRouter()


@router.get("")
async def list_users(
    role: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[dict]:
    q = select(User).order_by(User.name)
    if role:
        q = q.where(User.role == role)
    rows = (await db.execute(q)).scalars().all()
    return [
        {"id": u.id, "name": u.name, "role": u.role, "subject_id": u.subject_id, "level": u.level}
        for u in rows
    ]
