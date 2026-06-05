"""Subscription/billing — public plans, current subscription, mock checkout.
Bearer-auth (per-user); /api/v1 is API-key only so this lives under /api/billing."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user
from app.models import Payment, Plan, Subscription, User, now
from app.schemas import SubscribeIn
from app.serialize import plan_out, subscription_out
from app.services.billing import current_features, cycle_expiry, days_left, is_active, latest_subscription
from app.services.notify import create_notification

router = APIRouter()


@router.get("/plans")
async def list_plans(db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(Plan).order_by(Plan.order_idx))).scalars().all()
    return [plan_out(p) for p in rows]


@router.get("/me/subscription")
async def my_subscription(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    sub = await latest_subscription(db, user.id)
    active = is_active(sub)
    code = sub.plan_code if active else "free"
    plan = (await db.execute(select(Plan).where(Plan.code == code))).scalar_one_or_none()
    return {
        "plan_code": code,
        "plan": plan_out(plan) if plan else None,
        "subscription": subscription_out(sub, days_left(sub)) if active else None,
        "features": await current_features(db, user.id),
    }


@router.post("/subscribe")
async def subscribe(
    payload: SubscribeIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    plan = (await db.execute(select(Plan).where(Plan.code == payload.plan_code))).scalar_one_or_none()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tarif topilmadi")
    cycle = "yearly" if payload.billing_cycle == "yearly" else "monthly"
    amount = plan.price_yearly if cycle == "yearly" else plan.price_monthly

    # Supersede any current subscription.
    for s in (await db.execute(select(Subscription).where(Subscription.user_id == user.id, Subscription.status == "active"))).scalars().all():
        s.status = "expired"

    sub = Subscription(
        user_id=user.id, plan_code=plan.code, billing_cycle=cycle, status="active",
        expires_at=None if plan.code == "free" else cycle_expiry(cycle), auto_renew=True,
    )
    db.add(sub)

    if amount > 0:  # MOCK payment — instant success
        db.add(Payment(
            student_id=user.id, amount=amount, currency="UZS", period=now().strftime("%Y-%m"),
            status="paid", plan_code=plan.code, billing_cycle=cycle, method="mock",
        ))
    create_notification(
        db, user.id, "system", "Obunangiz faollashdi",
        body=f"{plan.name} tarifi faollashtirildi.", link="/billing",
    )
    await db.commit()
    await db.refresh(sub)
    return {"subscription": subscription_out(sub, days_left(sub)), "plan": plan_out(plan)}


@router.post("/me/subscription/cancel")
async def cancel_subscription(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    sub = await latest_subscription(db, user.id)
    if not sub or sub.status == "expired":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "faol obuna yo'q")
    sub.status = "canceled"
    sub.auto_renew = False
    await db.commit()
    await db.refresh(sub)
    return subscription_out(sub, days_left(sub))
