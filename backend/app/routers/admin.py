"""Admin surface — institutions, users (teacher/student), API keys.

Available to superadmin and institution_admin. This is where a domain owner
onboards an institution, adds subject-teachers, registers students and issues
integration API keys.
"""
from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_roles
from app.models import ApiKey, Institution, Payment, Plan, Subject, Subscription, User
from app.roster_import import parse_roster
from app.schemas import ApiKeyIn, InstitutionIn, PlanUpdateIn, UserCreateIn, UserUpdateIn
from app.serialize import api_key_out, institution_out, plan_out, subscription_out, user_out
from app.services.billing import days_left

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
    return [{**user_out(u), "password": u.password} for u in rows]


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


@router.put("/users/{user_id}")
async def update_user(
    user_id: int, payload: UserUpdateIn, db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN),
) -> dict:
    u = await db.get(User, user_id)
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "foydalanuvchi topilmadi")
    if payload.username and payload.username != u.username:
        if (await db.execute(select(User).where(User.username == payload.username))).scalar_one_or_none():
            raise HTTPException(status.HTTP_409_CONFLICT, "bunday username band")
        u.username = payload.username
    if payload.name is not None:
        u.name = payload.name
    if payload.password:
        u.password = payload.password
    if payload.level is not None:
        u.level = payload.level
    if payload.subject_id is not None:
        u.subject_id = payload.subject_id
    await db.commit()
    await db.refresh(u)
    return {**user_out(u), "password": u.password}


@router.post("/users/import")
async def import_users(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN),
) -> dict:
    """Bulk-create students from an uploaded .xlsx/.csv file."""
    rows = parse_roster(await file.read(), file.filename or "")
    if not rows:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fayldan foydalanuvchi topilmadi (ustunlar: ism, login, parol, daraja)")
    existing = {u for (u,) in (await db.execute(select(User.username))).all()}
    created, skipped = 0, []
    for r in rows:
        if r["username"] in existing:
            skipped.append({"username": r["username"], "reason": "username band"})
            continue
        db.add(User(role="student", name=r["name"], username=r["username"], password=r["password"], level=r["level"]))
        existing.add(r["username"])
        created += 1
    await db.commit()
    return {"created": created, "skipped": skipped, "total": len(rows)}


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


# ---- Plans & subscriptions ---------------------------------------------
@router.get("/plans")
async def admin_plans(db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN)) -> list[dict]:
    rows = (await db.execute(select(Plan).order_by(Plan.order_idx))).scalars().all()
    return [plan_out(p) for p in rows]


@router.put("/plans/{code}")
async def update_plan(
    code: str, payload: PlanUpdateIn, db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN)
) -> dict:
    plan = (await db.execute(select(Plan).where(Plan.code == code))).scalar_one_or_none()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "tarif topilmadi")
    if payload.price_monthly is not None:
        plan.price_monthly = payload.price_monthly
    if payload.price_yearly is not None:
        plan.price_yearly = payload.price_yearly
    if payload.features is not None:
        plan.features = {**(plan.features or {}), **payload.features}
    await db.commit()
    await db.refresh(plan)
    return plan_out(plan)


@router.get("/subscriptions")
async def admin_subscriptions(db: AsyncSession = Depends(get_db), _: User = Depends(ADMIN)) -> dict:
    subs = (await db.execute(select(Subscription).order_by(Subscription.started_at.desc()))).scalars().all()
    users = {u.id: u for u in (await db.execute(select(User))).scalars().all()}
    items = []
    for s in subs:
        u = users.get(s.user_id)
        items.append({
            **subscription_out(s, days_left(s)),
            "user_name": u.name if u else f"#{s.user_id}",
            "username": u.username if u else None,
        })
    paid = (await db.execute(select(Payment).where(Payment.status == "paid", Payment.plan_code.is_not(None)))).scalars().all()
    revenue = sum(p.amount for p in paid)
    by_plan: dict[str, int] = {}
    for s in subs:
        if s.status != "expired":
            by_plan[s.plan_code] = by_plan.get(s.plan_code, 0) + 1
    return {"subscriptions": items, "total_revenue": revenue, "by_plan": by_plan, "paid_count": len(paid)}
