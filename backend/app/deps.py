"""Shared FastAPI dependencies — auth (opaque bearer token) and role guards."""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import ApiKey, Session, User, now


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token kerak")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.get(Session, token)
    if not session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token yaroqsiz")
    user = await db.get(User, session.user_id)
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "foydalanuvchi topilmadi")
    return user


def require_roles(*roles: str):
    async def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "ruxsat yo'q")
        return user

    return _guard


async def require_api_key(
    x_api_key: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> ApiKey:
    """Guard for the public /api/v1 surface — authenticates by X-API-Key header."""
    if not x_api_key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "X-API-Key kerak")
    key = (await db.execute(select(ApiKey).where(ApiKey.key == x_api_key, ApiKey.active.is_(True)))).scalar_one_or_none()
    if not key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "API kalit yaroqsiz")
    key.last_used_at = now()
    await db.commit()
    return key
