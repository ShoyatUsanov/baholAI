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
