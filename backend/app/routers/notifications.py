"""Notification center for the logged-in user — list (with unread count),
mark one read, mark all read. Bearer-auth (per-user), polled by the frontend."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user
from app.models import Notification, User
from app.serialize import notification_out

router = APIRouter()


@router.get("")
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    rows = (
        await db.execute(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    unread = sum(1 for n in rows if not n.read)
    return {"items": [notification_out(n) for n in rows], "unread": unread}


@router.post("/{nid}/read")
async def read_one(
    nid: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    n = await db.get(Notification, nid)
    if n and n.user_id == user.id and not n.read:
        n.read = True
        await db.commit()
    return {"id": nid, "is_read": True}


@router.post("/read-all")
async def read_all(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    rows = (
        await db.execute(
            select(Notification).where(Notification.user_id == user.id, Notification.read.is_(False))
        )
    ).scalars().all()
    for n in rows:
        n.read = True
    await db.commit()
    return {"updated": len(rows)}
