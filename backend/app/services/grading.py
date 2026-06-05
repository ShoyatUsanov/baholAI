"""Grading orchestration.

Two clearly separated phases:
  1. Objective grading — deterministic, no AI (mcq, fill, truefalse, match, reorder).
  2. AI grading — open answers (short, essay) routed to the AI section.

`grade_submission` returns a transparent per-question breakdown so the student
and teacher can see exactly where each point came from.
"""
from __future__ import annotations

from app.ai import grade_open_answer
from app.ai.grader import REVIEW_THRESHOLD
from app.fingerprint import STRONG_MATCH, match_fingerprint

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


async def grade_submission(
    questions: list[dict], answers: dict, rubric: list[dict] | None = None,
    db=None, assignment_id: int | None = None,
) -> dict:
    objective_score = 0.0
    ai_score = 0.0
    max_score = 0.0
    breakdown: list[dict] = []
    rubric_breakdown: list[dict] = []
    confidences: list[int] = []
    used_ollama = False

    for idx, q in enumerate(questions):
        qid = str(q.get("id"))
        qmax = float(q.get("max_score", 1) or 1)
        max_score += qmax
        response = answers.get(qid)
        qtype = q.get("type")

        if qtype in AI_TYPES or q.get("ai_graded"):
            # Fingerprint-first: reuse a saved typical answer's ready feedback.
            fp_match = None
            if db is not None and assignment_id is not None and (response or "").strip():
                fp_match = await match_fingerprint(db, assignment_id, idx, response or "")

            if fp_match and fp_match["similarity"] >= STRONG_MATCH:
                fp = fp_match["fingerprint"]
                fp.hit_count += 1
                score = round(min(qmax, float(fp.suggested_points or 0)), 1)
                ai_score += score
                confidences.append(95)
                rubric_breakdown.append({
                    "criterion": fp.label, "points_given": score, "max_points": qmax,
                    "evidence": (response or "")[:160], "suggestion": fp.suggested_feedback,
                    "question_id": qid,
                })
                breakdown.append({
                    "question_id": qid, "type": qtype, "graded_by": "fingerprint",
                    "score": score, "max": qmax, "response": response,
                    "rationale": fp.suggested_feedback, "suggestions": [],
                    "fp_label": fp.label, "fp_similarity": round(fp_match["similarity"] * 100),
                })
                continue

            result = await grade_open_answer(
                prompt=q.get("prompt", ""),
                model_answer=q.get("answer", "") or "",
                student_answer=response or "",
                max_score=qmax,
                rubric=rubric or None,
            )
            ai_score += result["score"]
            confidences.append(result["confidence"])
            # Tag each rubric criterion with its question for multi-question grading.
            for crit in result["rubric_breakdown"]:
                rubric_breakdown.append({**crit, "question_id": qid})
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

    confidence = int(round(sum(confidences) / len(confidences))) if confidences else 100

    return {
        "objective_score": round(objective_score, 1),
        "ai_score": round(ai_score, 1),
        "total_score": round(objective_score + ai_score, 1),
        "max_score": round(max_score, 1),
        "breakdown": breakdown,
        "ai_provider": "ollama" if used_ollama else "fallback",
        "rubric_breakdown": rubric_breakdown,
        "confidence": confidence,
        "needs_review": confidence < REVIEW_THRESHOLD,
    }
