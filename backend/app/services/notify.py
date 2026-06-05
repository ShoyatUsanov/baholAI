"""Notification helper — one entry point so any module can raise an in-app
notification. Returns an unsaved row added to the session; the caller commits
within its own transaction (same pattern as the audit helper).
"""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification


def create_notification(
    session: AsyncSession,
    user_id: int,
    type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
) -> Notification:
    n = Notification(user_id=user_id, type=type, title=title, body=body, link=link)
    session.add(n)
    return n
