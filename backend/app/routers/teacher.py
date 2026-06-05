"""Teacher's own students (roster) — list with info, add (seat-billed), remove.
A teacher manages their own students; the plan caps how many seats they get."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_roles
from app.models import Grade, Submission, User
from app.roster_import import parse_roster
from app.schemas import TeacherStudentIn, UserUpdateIn
from app.serialize import user_out
from app.services.billing import (
    can_add_student,
    count_students,
    current_features,
    current_plan_code,
    student_cap,
)

router = APIRouter()
TEACHER = require_roles("teacher", "institution_admin", "superadmin")


@router.get("/students")
async def list_students(
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(TEACHER),
) -> dict:
    students = (
        await db.execute(
            select(User)
            .where(User.role == "student", User.teacher_id == teacher.id, User.active == True)  # noqa: E712
            .order_by(User.created_at)
        )
    ).scalars().all()
    ids = [s.id for s in students]

    stats = {sid: {"attempts": 0, "sum": 0.0, "n": 0, "last": None} for sid in ids}
    if ids:
        rows = (
            await db.execute(
                select(Submission, Grade)
                .join(Grade, Grade.submission_id == Submission.id, isouter=True)
                .where(Submission.student_id.in_(ids))
            )
        ).all()
        for sub, g in rows:
            st = stats[sub.student_id]
            st["attempts"] += 1
            if g and g.max_score:
                st["sum"] += g.total_score / g.max_score * 100
                st["n"] += 1
            if st["last"] is None or sub.submitted_at > st["last"]:
                st["last"] = sub.submitted_at

    out = []
    for s in students:
        st = stats[s.id]
        out.append({
            **user_out(s),
            "password": s.password,  # teacher manages their own students' credentials
            "attempts": st["attempts"],
            "avg_percent": round(st["sum"] / st["n"]) if st["n"] else None,
            "last_active": st["last"].isoformat() if st["last"] else None,
        })

    feats = await current_features(db, teacher.id)
    cap = student_cap(feats)
    return {
        "students": out, "count": len(out), "cap": cap,
        "plan_code": await current_plan_code(db, teacher.id),
        "can_add": cap is None or len(out) < cap,
    }


@router.post("/students", status_code=status.HTTP_201_CREATED)
async def add_student(
    payload: TeacherStudentIn,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(TEACHER),
) -> dict:
    allowed, cap, count = await can_add_student(db, teacher.id)
    if not allowed:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Tarif limiti to'ldi: {cap} o'quvchi (hozir {count}). "
            f"Tarifni yangilang yoki «Moslashuvchan» rejaga o'ting.",
        )
    if (await db.execute(select(User).where(User.username == payload.username))).scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "bunday username band")
    u = User(
        role="student", name=payload.name, username=payload.username,
        password=payload.password, teacher_id=teacher.id,
        institution_id=teacher.institution_id, level=payload.level,
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return user_out(u)


@router.put("/students/{student_id}")
async def update_student(
    student_id: int,
    payload: UserUpdateIn,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(TEACHER),
) -> dict:
    s = await db.get(User, student_id)
    if not s or s.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "o'quvchi topilmadi")
    if payload.username and payload.username != s.username:
        dup = (await db.execute(select(User).where(User.username == payload.username))).scalar_one_or_none()
        if dup:
            raise HTTPException(status.HTTP_409_CONFLICT, "bunday username band")
        s.username = payload.username
    if payload.name is not None:
        s.name = payload.name
    if payload.password:
        s.password = payload.password
    if payload.level is not None:
        s.level = payload.level
    await db.commit()
    await db.refresh(s)
    return {**user_out(s), "password": s.password}


@router.post("/students/import")
async def import_students(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(TEACHER),
) -> dict:
    """Bulk-create students from an uploaded .xlsx/.csv roster (respects the seat cap)."""
    rows = parse_roster(await file.read(), file.filename or "")
    if not rows:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fayldan o'quvchi topilmadi (ustunlar: ism, login, parol, daraja)")

    feats = await current_features(db, teacher.id)
    cap = student_cap(feats)
    count = await count_students(db, teacher.id)
    existing = {u for (u,) in (await db.execute(select(User.username))).all()}

    created, skipped = 0, []
    for r in rows:
        if cap is not None and count + created >= cap:
            skipped.append({"username": r["username"], "reason": "tarif limiti"})
            continue
        if r["username"] in existing:
            skipped.append({"username": r["username"], "reason": "username band"})
            continue
        db.add(User(
            role="student", name=r["name"], username=r["username"], password=r["password"],
            level=r["level"], teacher_id=teacher.id, institution_id=teacher.institution_id,
        ))
        existing.add(r["username"])
        created += 1
    await db.commit()
    return {"created": created, "skipped": skipped, "total": len(rows)}


@router.delete("/students/{student_id}")
async def remove_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(TEACHER),
) -> dict:
    s = await db.get(User, student_id)
    if not s or s.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "o'quvchi topilmadi")
    s.active = False  # frees the seat; keeps their submissions intact
    await db.commit()
    return {"id": student_id, "removed": True}
