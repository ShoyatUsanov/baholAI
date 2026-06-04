"""Plain-dict serializers for API responses (basic, no Pydantic response models)."""
from __future__ import annotations

from app.models import (
    Activity,
    Announcement,
    ApiKey,
    Assignment,
    Attendance,
    Collection,
    Deck,
    Feedback,
    Flashcard,
    Grade,
    Group,
    Institution,
    Lesson,
    Message,
    Notification,
    Payment,
    ScheduleEntry,
    Submission,
    Subject,
    Test,
    TestResult,
    User,
)


def _iso(dt):
    return dt.isoformat() if dt else None


def institution_out(i: Institution) -> dict:
    return {"id": i.id, "name": i.name, "kind": i.kind, "region": i.region}


def subject_out(s: Subject) -> dict:
    return {
        "id": s.id, "name": s.name, "slug": s.slug,
        "icon": s.icon, "color": s.color, "description": s.description,
    }


def user_out(u: User) -> dict:
    return {
        "id": u.id, "role": u.role, "name": u.name, "username": u.username,
        "institution_id": u.institution_id, "subject_id": u.subject_id,
        "level": u.level, "xp": u.xp, "active": u.active,
    }


def assignment_out(a: Assignment) -> dict:
    return {
        "id": a.id, "subject_id": a.subject_id, "teacher_id": a.teacher_id,
        "institution_id": a.institution_id, "title": a.title, "description": a.description,
        "method": a.method, "questions": a.questions,
        "target_student_ids": a.target_student_ids,
        "due_at": a.due_at.isoformat() if a.due_at else None,
        "created_at": a.created_at.isoformat(),
    }


def grade_out(g: Grade | None) -> dict | None:
    if not g:
        return None
    return {
        "objective_score": g.objective_score, "ai_score": g.ai_score,
        "total_score": g.total_score, "max_score": g.max_score,
        "percent": round(g.total_score / g.max_score * 100) if g.max_score else 0,
        "breakdown": g.breakdown, "ai_provider": g.ai_provider,
    }


def submission_out(s: Submission, grade: Grade | None = None) -> dict:
    return {
        "id": s.id, "assignment_id": s.assignment_id, "student_id": s.student_id,
        "answers": s.answers, "status": s.status,
        "submitted_at": s.submitted_at.isoformat(),
        "grade": grade_out(grade if grade is not None else s.grade),
    }


def feedback_out(f: Feedback) -> dict:
    return {
        "id": f.id, "submission_id": f.submission_id, "teacher_id": f.teacher_id,
        "student_id": f.student_id, "subject_id": f.subject_id,
        "rating": f.rating, "comment": f.comment,
        "seen_by_student": f.seen_by_student, "created_at": f.created_at.isoformat(),
    }


def collection_out(c: Collection, lesson_count: int | None = None) -> dict:
    return {
        "id": c.id, "subject_id": c.subject_id, "title": c.title,
        "description": c.description, "icon": c.icon, "level": c.level,
        "order_idx": c.order_idx, "lesson_count": lesson_count,
    }


def lesson_out(l: Lesson) -> dict:
    return {
        "id": l.id, "collection_id": l.collection_id, "title": l.title,
        "content": l.content, "est_minutes": l.est_minutes,
        "exercises": l.exercises, "order_idx": l.order_idx,
    }


def deck_out(d: Deck, card_count: int | None = None) -> dict:
    return {
        "id": d.id, "subject_id": d.subject_id, "collection_id": d.collection_id,
        "title": d.title, "description": d.description, "card_count": card_count,
    }


def flashcard_out(f: Flashcard) -> dict:
    return {"id": f.id, "deck_id": f.deck_id, "front": f.front, "back": f.back, "example": f.example}


def test_out(t: Test, with_answers: bool = False) -> dict:
    questions = t.questions
    if not with_answers:
        questions = [{k: v for k, v in q.items() if k != "answer"} for q in (t.questions or [])]
    return {
        "id": t.id, "subject_id": t.subject_id, "collection_id": t.collection_id,
        "title": t.title, "duration_minutes": t.duration_minutes,
        "is_final": t.is_final, "questions": questions, "question_count": len(t.questions or []),
    }


def test_result_out(r: TestResult) -> dict:
    return {
        "id": r.id, "test_id": r.test_id, "student_id": r.student_id,
        "score": r.score, "total": r.total, "percent": round(r.score / r.total * 100) if r.total else 0,
        "time_spent": r.time_spent, "wrong": r.wrong, "completed_at": _iso(r.completed_at),
    }


def group_out(g: Group) -> dict:
    return {
        "id": g.id, "name": g.name, "teacher_id": g.teacher_id, "subject_id": g.subject_id,
        "level": g.level, "member_ids": g.member_ids, "days": g.days,
        "start_time": g.start_time, "end_time": g.end_time, "room": g.room,
        "monthly_fee": g.monthly_fee, "active": g.active,
    }


def schedule_out(s: ScheduleEntry) -> dict:
    return {
        "id": s.id, "group_id": s.group_id, "teacher_id": s.teacher_id, "subject_id": s.subject_id,
        "title": s.title, "day_of_week": s.day_of_week,
        "start_time": s.start_time, "end_time": s.end_time, "room": s.room,
    }


def attendance_out(a: Attendance) -> dict:
    return {
        "id": a.id, "student_id": a.student_id, "group_id": a.group_id,
        "date": a.date, "status": a.status, "note": a.note, "marked_by": a.marked_by,
    }


def payment_out(p: Payment) -> dict:
    return {
        "id": p.id, "student_id": p.student_id, "amount": p.amount, "currency": p.currency,
        "period": p.period, "status": p.status, "group_id": p.group_id, "created_at": _iso(p.created_at),
    }


def message_out(m: Message) -> dict:
    return {
        "id": m.id, "from_id": m.from_id, "to_id": m.to_id, "body": m.body,
        "read": m.read, "created_at": _iso(m.created_at),
    }


def announcement_out(a: Announcement) -> dict:
    return {
        "id": a.id, "title": a.title, "body": a.body, "created_by": a.created_by,
        "audience": a.audience, "created_at": _iso(a.created_at),
    }


def notification_out(n: Notification) -> dict:
    return {
        "id": n.id, "user_id": n.user_id, "title": n.title, "body": n.body,
        "type": n.type, "read": n.read, "link": n.link, "created_at": _iso(n.created_at),
    }


def activity_out(a: Activity) -> dict:
    return {
        "id": a.id, "user_id": a.user_id, "type": a.type, "title": a.title,
        "score": a.score, "xp": a.xp, "created_at": _iso(a.created_at),
    }


def api_key_out(k: ApiKey, reveal: bool = False) -> dict:
    return {
        "id": k.id,
        "key": k.key if reveal else (k.key[:8] + "…" + k.key[-4:]),
        "label": k.label, "institution_id": k.institution_id,
        "scopes": k.scopes, "active": k.active,
        "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        "created_at": k.created_at.isoformat(),
    }
