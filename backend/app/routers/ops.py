"""Operational modules — groups, schedule, attendance, payments, messages,
announcements, notifications, activity."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, require_roles
from app.models import (
    Activity,
    Announcement,
    Attendance,
    Group,
    Message,
    Notification,
    Payment,
    ScheduleEntry,
    User,
)
from app.schemas import (
    AnnouncementIn,
    AttendanceIn,
    GroupIn,
    MessageIn,
    PaymentIn,
    ScheduleIn,
)
from app.serialize import (
    activity_out,
    announcement_out,
    attendance_out,
    group_out,
    message_out,
    notification_out,
    payment_out,
    schedule_out,
)
from app.services.notify import create_notification

router = APIRouter()
TEACHER = require_roles("teacher", "institution_admin", "superadmin")


# ---- Groups -------------------------------------------------------------
@router.get("/groups")
async def list_groups(teacher_id: int | None = None, student_id: int | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(Group).order_by(Group.created_at.desc()))).scalars().all()
    if teacher_id:
        rows = [g for g in rows if g.teacher_id == teacher_id]
    if student_id:
        rows = [g for g in rows if student_id in (g.member_ids or [])]
    return [group_out(g) for g in rows]


@router.post("/groups", status_code=status.HTTP_201_CREATED)
async def create_group(payload: GroupIn, db: AsyncSession = Depends(get_db), teacher: User = Depends(TEACHER)) -> dict:
    g = Group(name=payload.name, teacher_id=teacher.id, subject_id=payload.subject_id or teacher.subject_id,
              level=payload.level, member_ids=payload.member_ids, days=payload.days,
              start_time=payload.start_time, end_time=payload.end_time, room=payload.room,
              monthly_fee=payload.monthly_fee)
    db.add(g)
    await db.commit()
    await db.refresh(g)
    return group_out(g)


# ---- Schedule -----------------------------------------------------------
@router.get("/schedule")
async def list_schedule(teacher_id: int | None = None, student_id: int | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(ScheduleEntry).order_by(ScheduleEntry.day_of_week, ScheduleEntry.start_time))).scalars().all()
    if teacher_id:
        rows = [s for s in rows if s.teacher_id == teacher_id]
    if student_id:
        groups = (await db.execute(select(Group))).scalars().all()
        my = {g.id for g in groups if student_id in (g.member_ids or [])}
        rows = [s for s in rows if s.group_id in my]
    return [schedule_out(s) for s in rows]


@router.post("/schedule", status_code=status.HTTP_201_CREATED)
async def create_schedule(payload: ScheduleIn, db: AsyncSession = Depends(get_db), teacher: User = Depends(TEACHER)) -> dict:
    s = ScheduleEntry(group_id=payload.group_id, teacher_id=teacher.id,
                      subject_id=payload.subject_id or teacher.subject_id, title=payload.title,
                      day_of_week=payload.day_of_week, start_time=payload.start_time,
                      end_time=payload.end_time, room=payload.room)
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return schedule_out(s)


# ---- Attendance ---------------------------------------------------------
@router.get("/attendance")
async def list_attendance(student_id: int | None = None, group_id: int | None = None, date: str | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(Attendance).order_by(Attendance.date.desc())
    if student_id:
        q = q.where(Attendance.student_id == student_id)
    if group_id:
        q = q.where(Attendance.group_id == group_id)
    if date:
        q = q.where(Attendance.date == date)
    return [attendance_out(a) for a in (await db.execute(q)).scalars().all()]


@router.post("/attendance", status_code=status.HTTP_201_CREATED)
async def mark_attendance(payload: AttendanceIn, db: AsyncSession = Depends(get_db), teacher: User = Depends(TEACHER)) -> dict:
    a = Attendance(student_id=payload.student_id, group_id=payload.group_id, date=payload.date,
                   status=payload.status, note=payload.note, marked_by=teacher.id)
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return attendance_out(a)


# ---- Payments -----------------------------------------------------------
@router.get("/payments")
async def list_payments(student_id: int | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(Payment).order_by(Payment.created_at.desc())
    if student_id:
        q = q.where(Payment.student_id == student_id)
    return [payment_out(p) for p in (await db.execute(q)).scalars().all()]


@router.post("/payments", status_code=status.HTTP_201_CREATED)
async def create_payment(payload: PaymentIn, db: AsyncSession = Depends(get_db), _: User = Depends(TEACHER)) -> dict:
    p = Payment(student_id=payload.student_id, amount=payload.amount, currency=payload.currency,
                period=payload.period, status=payload.status, group_id=payload.group_id)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return payment_out(p)


@router.post("/payments/{pid}/pay")
async def mark_paid(pid: int, db: AsyncSession = Depends(get_db), _: User = Depends(TEACHER)) -> dict:
    p = await db.get(Payment, pid)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "to'lov topilmadi")
    p.status = "paid"
    await db.commit()
    return payment_out(p)


# ---- Messages -----------------------------------------------------------
@router.get("/messages")
async def list_messages(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict]:
    rows = (await db.execute(
        select(Message).where(or_(Message.from_id == user.id, Message.to_id == user.id)).order_by(Message.created_at)
    )).scalars().all()
    return [message_out(m) for m in rows]


@router.post("/messages", status_code=status.HTTP_201_CREATED)
async def send_message(payload: MessageIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    m = Message(from_id=user.id, to_id=payload.to_id, body=payload.body)
    db.add(m)
    db.add(Notification(user_id=payload.to_id, title="Yangi xabar", body=payload.body[:80], type="message", link="/messages"))
    await db.commit()
    await db.refresh(m)
    return message_out(m)


@router.post("/messages/{mid}/read")
async def read_message(mid: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    m = await db.get(Message, mid)
    if m and m.to_id == user.id:
        m.read = True
        await db.commit()
    return {"id": mid, "read": True}


# ---- Announcements ------------------------------------------------------
@router.get("/announcements")
async def list_announcements(db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(select(Announcement).order_by(Announcement.created_at.desc()))).scalars().all()
    return [announcement_out(a) for a in rows]


@router.post("/announcements", status_code=status.HTTP_201_CREATED)
async def create_announcement(payload: AnnouncementIn, db: AsyncSession = Depends(get_db), teacher: User = Depends(TEACHER)) -> dict:
    a = Announcement(title=payload.title, body=payload.body, created_by=teacher.id, audience=payload.audience)
    db.add(a)
    await db.flush()

    # Fan-out to the audience as in-app notifications.
    target_roles = {"students": ["student"], "teachers": ["teacher"]}.get(payload.audience, ["student", "teacher"])
    ids = (
        await db.execute(
            select(User.id).where(User.role.in_(target_roles), User.active.is_(True), User.id != teacher.id)
        )
    ).scalars().all()
    for uid in ids:
        create_notification(db, uid, "announcement", payload.title, body=(payload.body or "")[:120], link="/notifications")

    await db.commit()
    await db.refresh(a)
    return announcement_out(a)


# ---- Notifications ------------------------------------------------------
@router.get("/notifications")
async def list_notifications(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict]:
    rows = (await db.execute(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())
    )).scalars().all()
    return [notification_out(n) for n in rows]


@router.post("/notifications/{nid}/read")
async def read_notification(nid: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    n = await db.get(Notification, nid)
    if n and n.user_id == user.id:
        n.read = True
        await db.commit()
    return {"id": nid, "read": True}


# ---- Activity -----------------------------------------------------------
@router.get("/activity")
async def list_activity(student_id: int | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> list[dict]:
    uid = student_id or user.id
    rows = (await db.execute(
        select(Activity).where(Activity.user_id == uid).order_by(Activity.created_at.desc()).limit(50)
    )).scalars().all()
    return [activity_out(a) for a in rows]
