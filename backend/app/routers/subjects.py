"""Subjects (fanlar) — catalog + admin create. Subject-agnostic core."""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_roles
from app.models import Subject, User
from app.schemas import SubjectIn
from app.serialize import subject_out

router = APIRouter()


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "fan"


@router.get("")
async def list_subjects(db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(Subject).order_by(Subject.name))).scalars().all()
    return [subject_out(s) for s in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_subject(
    payload: SubjectIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("superadmin", "institution_admin")),
) -> dict:
    slug = payload.slug or _slugify(payload.name)
    if (await db.execute(select(Subject).where(Subject.slug == slug))).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "bunday slug mavjud")
    s = Subject(
        name=payload.name, slug=slug, icon=payload.icon,
        color=payload.color, description=payload.description,
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return subject_out(s)
