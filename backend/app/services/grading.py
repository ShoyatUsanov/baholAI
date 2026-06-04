"""Grading orchestration.

Two clearly separated phases:
  1. Objective grading — deterministic, no AI (mcq, fill, truefalse, match, reorder).
  2. AI grading — open answers (short, essay) routed to the AI section.

`grade_submission` returns a transparent per-question breakdown so the student
and teacher can see exactly where each point came from.
"""
from __future__ import annotations

from app.ai import grade_open_answer

OBJECTIVE_TYPES = {"mcq", "fill", "truefalse", "match", "reorder"}
AI_TYPES = {"short", "essay"}


def _norm(value) -> str:
    return str(value if value is not None else "").strip().lower()


def _score_objective(q: dict, response) -> tuple[float, bool]:
    max_score = float(q.get("max_score", 1) or 1)
    correct = q.get("answer")
    qtype = q.get("type")

    if qtype == "truefalse":
        ok = _norm(response) == _norm(correct)
    elif qtype in ("reorder",):
        ok = list(response or []) == list(correct or [])
    elif qtype == "match":
        ok = bool(correct) and dict(response or {}) == dict(correct or {})
    elif qtype == "fill":
        accepted = correct if isinstance(correct, list) else [correct]
        ok = any(_norm(response) == _norm(a) for a in accepted)
    else:  # mcq + anything else objective
        ok = _norm(response) == _norm(correct)

    return (max_score if ok else 0.0), ok


async def grade_submission(questions: list[dict], answers: dict) -> dict:
    objective_score = 0.0
    ai_score = 0.0
    max_score = 0.0
    breakdown: list[dict] = []
    used_ollama = False

    for q in questions:
        qid = str(q.get("id"))
        qmax = float(q.get("max_score", 1) or 1)
        max_score += qmax
        response = answers.get(qid)
        qtype = q.get("type")

        if qtype in AI_TYPES or q.get("ai_graded"):
            result = await grade_open_answer(
                prompt=q.get("prompt", ""),
                model_answer=q.get("answer", "") or "",
                student_answer=response or "",
                max_score=qmax,
            )
            ai_score += result["score"]
            if result["provider"] == "ollama":
                used_ollama = True
            breakdown.append({
                "question_id": qid,
                "type": qtype,
                "graded_by": "ai",
                "score": result["score"],
                "max": qmax,
                "response": response,
                "rationale": result["rationale"],
                "suggestions": result["suggestions"],
            })
        else:
            score, ok = _score_objective(q, response)
            objective_score += score
            breakdown.append({
                "question_id": qid,
                "type": qtype,
                "graded_by": "auto",
                "score": score,
                "max": qmax,
                "response": response,
                "correct": ok,
                "expected": q.get("answer"),
            })

    return {
        "objective_score": round(objective_score, 1),
        "ai_score": round(ai_score, 1),
        "total_score": round(objective_score + ai_score, 1),
        "max_score": round(max_score, 1),
        "breakdown": breakdown,
        "ai_provider": "ollama" if used_ollama else "fallback",
    }
