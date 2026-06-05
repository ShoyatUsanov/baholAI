"""Subscription / feature-flag logic. Plans live in the DB (admin-editable);
PLAN_DEFS is the seed + fallback. Feature flags really gate behaviour."""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Grade, Plan, Submission, Subscription


def _utcnow() -> datetime:
    # Naive UTC — matches how datetimes come back from SQLite (avoids
    # offset-naive vs offset-aware comparison errors).
    return datetime.utcnow()

PLAN_DEFS = [
    {
        "code": "free", "name": "Free", "price_monthly": 0, "price_yearly": 0, "order_idx": 0,
        "features": {
            "ai_grading_limit": 10, "plagiarism": False, "explainability": "basic",
            "analytics": False, "flashcards": "limited", "tests": "limited",
            "xp_rewards": False, "xp_multiplier": 1, "priority_appeal": False, "support": "community",
        },
    },
    {
        "code": "medium", "name": "Medium", "price_monthly": 19000, "price_yearly": 182000, "order_idx": 1,
        "features": {
            "ai_grading_limit": None, "plagiarism": True, "explainability": "full",
            "analytics": "basic", "flashcards": "full", "tests": "full",
            "xp_rewards": True, "xp_multiplier": 1, "priority_appeal": False, "support": "email",
        },
    },
    {
        "code": "premium", "name": "Premium", "price_monthly": 39000, "price_yearly": 374000, "order_idx": 2,
        "features": {
            "ai_grading_limit": None, "plagiarism": True, "explainability": "full",
            "analytics": "advanced", "flashcards": "full", "tests": "full",
            "xp_rewards": True, "xp_multiplier": 2, "priority_appeal": True, "support": "priority",
        },
    },
]

FREE_FEATURES = PLAN_DEFS[0]["features"]
_BY_CODE = {p["code"]: p for p in PLAN_DEFS}


def is_active(sub: Subscription | None) -> bool:
    # 'canceled' (auto_renew off) still grants access until expiry; only 'expired'
    # or a passed expiry date drops the user back to free.
    if not sub or sub.status == "expired":
        return False
    return sub.expires_at is None or sub.expires_at >= _utcnow()


def days_left(sub: Subscription | None) -> int | None:
    if not sub or sub.expires_at is None:
        return None
    return max(0, (sub.expires_at - _utcnow()).days)


async def latest_subscription(db: AsyncSession, user_id: int) -> Subscription | None:
    return (
        await db.execute(
            select(Subscription).where(Subscription.user_id == user_id).order_by(Subscription.started_at.desc())
        )
    ).scalars().first()


async def current_plan_code(db: AsyncSession, user_id: int) -> str:
    sub = await latest_subscription(db, user_id)
    return sub.plan_code if is_active(sub) else "free"


async def current_features(db: AsyncSession, user_id: int) -> dict:
    code = await current_plan_code(db, user_id)
    plan = (await db.execute(select(Plan).where(Plan.code == code))).scalar_one_or_none()
    if plan and plan.features:
        return plan.features
    return _BY_CODE.get(code, _BY_CODE["free"])["features"]


async def has_feature(db: AsyncSession, user_id: int, feature: str) -> bool:
    return bool((await current_features(db, user_id)).get(feature))


async def require_feature(db: AsyncSession, user_id: int, feature: str) -> None:
    if not await has_feature(db, user_id, feature):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu imkoniyat tarifingizda mavjud emas — tarifni yangilang")


async def ai_graded_this_month(db: AsyncSession, student_id: int) -> int:
    today = _utcnow()
    start = datetime(today.year, today.month, 1)
    rows = (
        await db.execute(
            select(Grade)
            .join(Submission, Grade.submission_id == Submission.id)
            .where(Submission.student_id == student_id, Submission.submitted_at >= start)
        )
    ).scalars().all()
    return sum(1 for g in rows if g.rubric_breakdown)


def cycle_expiry(billing_cycle: str) -> datetime:
    return _utcnow() + timedelta(days=365 if billing_cycle == "yearly" else 30)
