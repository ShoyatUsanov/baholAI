"""Audit trail helper — one factory for every grading-decision log entry.

Returns an unsaved AuditLog; the caller adds it to the session and commits with
the rest of the operation, so the audit write shares the transaction.
"""
from __future__ import annotations

from app.models import AuditLog


def audit_log(
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int,
    detail: dict | None = None,
) -> AuditLog:
    return AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail or {},
    )
