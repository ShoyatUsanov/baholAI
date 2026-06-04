"""Analytics — aggregates grades + feedback into student / subject / overview views.

Teacher feedback (rating) is folded into the student's per-subject stats, so the
human signal and the AI/auto score live side by side.
"""
from __future__ import annotations

from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Assignment, Feedback, Grade, Institution, Submission, Subject, User


def _pct(score: float, mx: float) -> int:
    return round(score / mx * 100) if mx else 0


async def student_analytics(db: AsyncSession, student_id: int) -> dict:
    rows = (
        await db.execute(
            select(Grade, Submission, Assignment, Subject)
            .join(Submission, Grade.submission_id == Submission.id)
            .join(Assignment, Submission.assignment_id == Assignment.id)
            .join(Subject, Assignment.subject_id == Subject.id)
            .where(Submission.student_id == student_id)
        )
    ).all()

    by_subject: dict[int, dict] = defaultdict(
        lambda: {"subject": None, "attempts": 0, "score": 0.0, "max": 0.0, "ai_score": 0.0, "ratings": []}
    )
    recent: list[dict] = []
    for grade, sub, assignment, subject in rows:
        b = by_subject[subject.id]
        b["subject"] = {"id": subject.id, "name": subject.name, "icon": subject.icon, "color": subject.color}
        b["attempts"] += 1
        b["score"] += grade.total_score
        b["max"] += grade.max_score
        b["ai_score"] += grade.ai_score
        recent.append({
            "submission_id": sub.id,
            "assignment": assignment.title,
            "subject": subject.name,
            "percent": _pct(grade.total_score, grade.max_score),
            "submitted_at": sub.submitted_at.isoformat(),
        })

    # Fold in teacher feedback ratings per subject.
    fb_rows = (
        await db.execute(
            select(Feedback.subject_id, Feedback.rating).where(Feedback.student_id == student_id)
        )
    ).all()
    for subject_id, rating in fb_rows:
        if subject_id in by_subject:
            by_subject[subject_id]["ratings"].append(rating)

    subjects = []
    total_score = total_max = 0.0
    for b in by_subject.values():
        total_score += b["score"]
        total_max += b["max"]
        ratings = b.pop("ratings")
        subjects.append({
            "subject": b["subject"],
            "attempts": b["attempts"],
            "percent": _pct(b["score"], b["max"]),
            "ai_percent": _pct(b["ai_score"], b["max"]),
            "avg_teacher_rating": round(sum(ratings) / len(ratings), 1) if ratings else None,
            "feedback_count": len(ratings),
        })

    recent.sort(key=lambda r: r["submitted_at"], reverse=True)
    return {
        "student_id": student_id,
        "overall_percent": _pct(total_score, total_max),
        "total_attempts": len(rows),
        "subjects": sorted(subjects, key=lambda s: s["subject"]["name"]),
        "recent": recent[:10],
    }


async def subject_analytics(db: AsyncSession, subject_id: int) -> dict:
    subject = await db.get(Subject, subject_id)
    rows = (
        await db.execute(
            select(Grade, Submission, User)
            .join(Submission, Grade.submission_id == Submission.id)
            .join(Assignment, Submission.assignment_id == Assignment.id)
            .join(User, Submission.student_id == User.id)
            .where(Assignment.subject_id == subject_id)
        )
    ).all()

    per_student: dict[int, dict] = defaultdict(lambda: {"name": "", "score": 0.0, "max": 0.0, "attempts": 0})
    total_score = total_max = 0.0
    for grade, sub, student in rows:
        s = per_student[student.id]
        s["name"] = student.name
        s["score"] += grade.total_score
        s["max"] += grade.max_score
        s["attempts"] += 1
        total_score += grade.total_score
        total_max += grade.max_score

    leaderboard = sorted(
        ({"student_id": sid, "name": s["name"], "percent": _pct(s["score"], s["max"]), "attempts": s["attempts"]}
         for sid, s in per_student.items()),
        key=lambda x: x["percent"],
        reverse=True,
    )
    return {
        "subject": {"id": subject.id, "name": subject.name, "icon": subject.icon} if subject else None,
        "students": len(per_student),
        "submissions": len(rows),
        "avg_percent": _pct(total_score, total_max),
        "leaderboard": leaderboard,
    }


async def overview(db: AsyncSession) -> dict:
    async def count(model, *where):
        q = select(func.count()).select_from(model)
        for w in where:
            q = q.where(w)
        return (await db.scalar(q)) or 0

    grades = (await db.execute(select(Grade.total_score, Grade.max_score, Grade.ai_provider))).all()
    tot = sum(g[0] for g in grades)
    mx = sum(g[1] for g in grades)
    ollama = sum(1 for g in grades if g[2] == "ollama")
    return {
        "institutions": await count(Institution),
        "subjects": await count(Subject),
        "teachers": await count(User, User.role == "teacher"),
        "students": await count(User, User.role == "student"),
        "assignments": await count(Assignment),
        "submissions": await count(Submission),
        "avg_percent": _pct(tot, mx),
        "ai_graded_by_ollama": ollama,
        "ai_graded_by_fallback": len(grades) - ollama,
    }


async def assignment_progress(db: AsyncSession, teacher_id: int) -> dict:
    """Per-assignment completion for a teacher: who did it, who hasn't, avg score.

    An assignment with an empty ``target_student_ids`` is addressed to every
    student (same rule as the assignment list), so 'assigned' falls back to the
    whole student body. This powers the "har bir vazifa qilinganini ko'rish" view.
    """
    students = (await db.execute(select(User.id, User.name).where(User.role == "student"))).all()
    all_ids = [sid for sid, _ in students]
    name_by_id = {sid: name for sid, name in students}

    assignments = (
        await db.execute(
            select(Assignment)
            .where(Assignment.teacher_id == teacher_id)
            .order_by(Assignment.created_at.desc())
        )
    ).scalars().all()

    items: list[dict] = []
    for a in assignments:
        targets = a.target_student_ids or all_ids
        sub_rows = (
            await db.execute(
                select(Submission.student_id, Grade.total_score, Grade.max_score, Submission.submitted_at)
                .join(Grade, Grade.submission_id == Submission.id, isouter=True)
                .where(Submission.assignment_id == a.id)
            )
        ).all()
        done_ids: set[int] = set()
        score = mx = 0.0
        last: str | None = None
        for sid, s_score, s_max, ts in sub_rows:
            done_ids.add(sid)
            score += s_score or 0.0
            mx += s_max or 0.0
            iso = ts.isoformat()
            if last is None or iso > last:
                last = iso
        done = [sid for sid in targets if sid in done_ids]
        pending = [sid for sid in targets if sid not in done_ids]
        items.append({
            "id": a.id,
            "title": a.title,
            "method": a.method,
            "questions": len(a.questions or []),
            "created_at": a.created_at.isoformat(),
            "due_at": a.due_at.isoformat() if a.due_at else None,
            "assigned": len(targets),
            "submitted": len(done),
            "pending": len(pending),
            "completion": round(len(done) / len(targets) * 100) if targets else 0,
            "avg_percent": _pct(score, mx),
            "last_submission": last,
            "done_students": [{"id": sid, "name": name_by_id.get(sid, f"#{sid}")} for sid in done],
            "pending_students": [{"id": sid, "name": name_by_id.get(sid, f"#{sid}")} for sid in pending],
        })

    total_assigned = sum(i["assigned"] for i in items)
    total_submitted = sum(i["submitted"] for i in items)
    return {
        "teacher_id": teacher_id,
        "assignments": items,
        "totals": {
            "assignments": len(items),
            "assigned": total_assigned,
            "submitted": total_submitted,
            "completion": round(total_submitted / total_assigned * 100) if total_assigned else 0,
        },
    }


async def teacher_students(db: AsyncSession, subject_id: int) -> dict:
    """Roster of every student with their engagement in one subject.

    Includes students who have not started yet (engaged=False) so the teacher
    sees the whole class, not just those who submitted.
    """
    students = (
        await db.execute(
            select(User.id, User.name, User.username, User.level, User.xp)
            .where(User.role == "student")
            .order_by(User.name)
        )
    ).all()

    total_assignments = (
        await db.scalar(
            select(func.count()).select_from(Assignment).where(Assignment.subject_id == subject_id)
        )
    ) or 0

    rows = (
        await db.execute(
            select(
                Submission.student_id,
                Submission.assignment_id,
                Grade.total_score,
                Grade.max_score,
                Submission.submitted_at,
            )
            .join(Assignment, Submission.assignment_id == Assignment.id)
            .join(Grade, Grade.submission_id == Submission.id, isouter=True)
            .where(Assignment.subject_id == subject_id)
        )
    ).all()

    agg: dict[int, dict] = defaultdict(
        lambda: {"score": 0.0, "max": 0.0, "attempts": 0, "assignments": set(), "last": None}
    )
    for sid, aid, score, mx, ts in rows:
        s = agg[sid]
        s["attempts"] += 1
        s["assignments"].add(aid)
        s["score"] += score or 0.0
        s["max"] += mx or 0.0
        iso = ts.isoformat()
        if s["last"] is None or iso > s["last"]:
            s["last"] = iso

    fb = (
        await db.execute(
            select(Feedback.student_id, Feedback.rating).where(Feedback.subject_id == subject_id)
        )
    ).all()
    fb_agg: dict[int, list[int]] = defaultdict(list)
    for sid, rating in fb:
        fb_agg[sid].append(rating)

    roster: list[dict] = []
    for sid, name, username, level, xp in students:
        s = agg.get(sid)
        ratings = fb_agg.get(sid, [])
        completed = len(s["assignments"]) if s else 0
        roster.append({
            "student_id": sid,
            "name": name,
            "username": username,
            "level": level,
            "xp": xp,
            "attempts": s["attempts"] if s else 0,
            "percent": _pct(s["score"], s["max"]) if s else 0,
            "completed_assignments": completed,
            "total_assignments": total_assignments,
            "completion": round(completed / total_assignments * 100) if total_assignments else 0,
            "last_activity": s["last"] if s else None,
            "avg_rating": round(sum(ratings) / len(ratings), 1) if ratings else None,
            "engaged": bool(s),
        })
    roster.sort(key=lambda r: (r["engaged"], r["percent"], r["completion"]), reverse=True)
    return {"subject_id": subject_id, "total_assignments": total_assignments, "students": roster}
