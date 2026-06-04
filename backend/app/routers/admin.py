"""Admin surface — institutions, users (teacher/student), API keys.

Available to superadmin and institution_admin. This is where a domain owner
onboards an institution, adds subject-teachers, registers students and issues
integration API keys.
"""
from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_roles
from app.models import ApiKey, Institution, Subject, User
from app.schemas import ApiKeyIn, InstitutionIn, UserCreateIn
from app.serialize import api_key_out, institution_out, user_out

router = APIRouter()
ADMIN = require_roles("superadmin", "institution_admin")


# ---- Institutions -------------------------------------------------------
@router.get("/institutions")
async def list_institutions(db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN)) -> list[dict]:
    rows = (await db.execute(select(Institution).order_by(Institution.name))).scalars().all()
    return [institution_out(i) for i in rows]


@router.post("/institutions", status_code=status.HTTP_201_CREATED)
async def create_institution(
    payload: InstitutionIn, db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN)
) -> dict:
    inst = Institution(name=payload.name, kind=payload.kind, region=payload.region)
    db.add(inst)
    await db.commit()
    await db.refresh(inst)
    return institution_out(inst)


# ---- Users (teachers / students) ---------------------------------------
@router.get("/users")
async def list_users(
    role: str | None = None,
    subject_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(ADMIN),
) -> list[dict]:
    q = select(User).order_by(User.name)
    if role:
        q = q.where(User.role == role)
    if subject_id:
        q = q.where(User.subject_id == subject_id)
    rows = (await db.execute(q)).scalars().all()
    return [user_out(u) for u in rows]


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreateIn, db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN)) -> dict:
    if payload.role not in ("teacher", "student", "institution_admin"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "noto'g'ri rol")
    if (await db.execute(select(User).where(User.username == payload.username))).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "bunday username mavjud")
    if payload.role == "teacher" and payload.subject_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "o'qituvchi uchun fan (subject_id) kerak")
    if payload.subject_id and not await db.get(Subject, payload.subject_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "fan topilmadi")
    u = User(
        role=payload.role, name=payload.name, username=payload.username,
        password=payload.password, institution_id=payload.institution_id,
        subject_id=payload.subject_id, level=payload.level,
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return user_out(u)


# ---- API keys -----------------------------------------------------------
@router.get("/api-keys")
async def list_api_keys(db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN)) -> list[dict]:
    rows = (await db.execute(select(ApiKey).order_by(ApiKey.created_at.desc()))).scalars().all()
    return [api_key_out(k) for k in rows]


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
async def create_api_key(payload: ApiKeyIn, db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN)) -> dict:
    key = "bk_" + secrets.token_hex(20)
    k = ApiKey(key=key, label=payload.label, institution_id=payload.institution_id, scopes=payload.scopes)
    db.add(k)
    await db.commit()
    await db.refresh(k)
    # Reveal the full key only on creation.
    return api_key_out(k, reveal=True)


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(key_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN)) -> dict:
    k = await db.get(ApiKey, key_id)
    if not k:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "kalit topilmadi")
    k.active = False
    await db.commit()
    return {"id": key_id, "active": False}
