"""Answer fingerprints — teacher-saved "typical" answers whose ready feedback is
reused for new, similar answers. Bearer-auth (teacher); /api/v1 is API-key only."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_roles
from app.fingerprint import text_vector
from app.models import AnswerFingerprint, User
from app.schemas import FingerprintIn
from app.serialize import fingerprint_out

router = APIRouter()
TEACHER = require_roles("teacher", "institution_admin", "superadmin")


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_fingerprint(
    payload: FingerprintIn,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(TEACHER),
) -> dict:
    fp = AnswerFingerprint(
        assignment_id=payload.assignment_id,
        question_index=payload.question_index,
        label=payload.label.strip(),
        canonical_text=payload.canonical_text.strip(),
        vector=await text_vector(payload.canonical_text),
        suggested_points=payload.suggested_points,
        suggested_feedback=payload.suggested_feedback.strip(),
        created_by=teacher.id,
    )
    db.add(fp)
    await db.commit()
    await db.refresh(fp)
    return fingerprint_out(fp)


@router.get("")
async def list_fingerprints(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(TEACHER),
) -> list[dict]:
    rows = (
        await db.execute(
            select(AnswerFingerprint)
            .where(AnswerFingerprint.assignment_id == assignment_id)
            .order_by(AnswerFingerprint.question_index, AnswerFingerprint.created_at)
        )
    ).scalars().all()
    return [fingerprint_out(f) for f in rows]


@router.delete("/{fp_id}")
async def delete_fingerprint(
    fp_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(TEACHER),
) -> dict:
    fp = await db.get(AnswerFingerprint, fp_id)
    if not fp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "fingerprint topilmadi")
    await db.delete(fp)
    await db.commit()
    return {"id": fp_id, "deleted": True}
