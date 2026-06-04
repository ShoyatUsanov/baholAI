"""Public integration API (/api/v1) — authenticated by an admin-issued API key.

Demonstrates the "give API" requirement: external systems read the catalog and
analytics with an X-API-Key header. Scope-gated and basic on purpose.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_api_key
from app.models import ApiKey, Subject
from app.serialize import subject_out
from app.services import analytics as svc

router = APIRouter()


def _require_scope(key: ApiKey, scope: str) -> None:
    if scope not in (key.scopes or []):
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"'{scope}' ruxsati yo'q")


@router.get("/subjects")
async def v1_subjects(db: AsyncSession = Depends(get_db), key: ApiKey = Depends(require_api_key)) -> dict:
    _require_scope(key, "read:subjects")
    rows = (await db.execute(select(Subject).order_by(Subject.name))).scalars().all()
    return {"data": [subject_out(s) for s in rows]}


@router.get("/analytics/overview")
async def v1_overview(db: AsyncSession = Depends(get_db), key: ApiKey = Depends(require_api_key)) -> dict:
    _require_scope(key, "read:analytics")
    return {"data": await svc.overview(db)}
