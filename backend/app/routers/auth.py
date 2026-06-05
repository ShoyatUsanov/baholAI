"""Auth — username/password login issuing an opaque bearer token (basic)."""
from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user
from app.models import Session, User
from app.schemas import LoginIn, RegisterIn
from app.serialize import user_out

router = APIRouter()


@router.post("/login")
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)) -> dict:
    user = (
        await db.execute(select(User).where(User.username == payload.username))
    ).scalar_one_or_none()
    if not user or user.password != payload.password or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "login yoki parol noto'g'ri")
    token = secrets.token_hex(24)
    db.add(Session(token=token, user_id=user.id))
    await db.commit()
    return {"token": token, "user": user_out(user)}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterIn, db: AsyncSession = Depends(get_db)) -> dict:
    """Self-registration for students and teachers (admins are provisioned only).
    Issues a token immediately so the user is logged in on success."""
    name = payload.name.strip()
    username = payload.username.strip()
    if not name or not username or not payload.password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "barcha maydonlar to'ldirilishi shart")
    role = payload.role if payload.role in ("student", "teacher") else "student"

    exists = (
        await db.execute(select(User).where(User.username == username))
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu login allaqachon band")

    user = User(role=role, name=name, username=username, password=payload.password, active=True)
    db.add(user)
    await db.flush()
    token = secrets.token_hex(24)
    db.add(Session(token=token, user_id=user.id))
    await db.commit()
    return {"token": token, "user": user_out(user)}


@router.get("/me")
async def me(user: User = Depends(get_current_user)) -> dict:
    return user_out(user)
