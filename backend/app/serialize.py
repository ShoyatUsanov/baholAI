"""Plain-dict serializers for API responses (basic, no Pydantic response models)."""
from __future__ import annotations

from app.models import ApiKey, Assignment, Feedback, Grade, Institution, Submission, Subject, User


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


def api_key_out(k: ApiKey, reveal: bool = False) -> dict:
    return {
        "id": k.id,
        "key": k.key if reveal else (k.key[:8] + "…" + k.key[-4:]),
        "label": k.label, "institution_id": k.institution_id,
        "scopes": k.scopes, "active": k.active,
        "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        "created_at": k.created_at.isoformat(),
    }
