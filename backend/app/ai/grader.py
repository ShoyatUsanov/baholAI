"""AI grading of open-ended answers + teacher feedback drafting.

Grading is *explainable*: every point is tied to a rubric criterion with the
exact evidence from the student's answer that earned it, plus a confidence
score. Low confidence auto-flags the submission for teacher review.

Both functions try the local LLM first and fall back to a transparent
rule-based scorer so the platform is fully functional with no model installed.
All human-facing text is Uzbek (settings.ai_language).
"""
from __future__ import annotations

import re

from app.ai.provider import generate_json
from app.config import get_settings

settings = get_settings()

REVIEW_THRESHOLD = 70  # confidence below this → needs_review

_WORD_RE = re.compile(r"[\wʻʼ'`-]+", re.UNICODE)
_SENT_RE = re.compile(r"(?<=[.!?])\s+|\n+")
_STOP = {
    "va", "ham", "bu", "u", "shu", "the", "a", "an", "is", "are", "to", "of",
    "in", "on", "for", "uchun", "bilan", "keyin", "yoki", "ya'ni", "lekin",
    "nima", "qanday", "har", "bir", "esa", "deb", "kabi",
}


def _tokens(text: str) -> list[str]:
    return [t.lower() for t in _WORD_RE.findall(text or "") if len(t) > 2 and t.lower() not in _STOP]


def _keywords(source: str) -> list[str]:
    seen: list[str] = []
    for t in _tokens(source):
        if t not in seen:
            seen.append(t)
    return seen


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENT_RE.split(text or "") if s.strip()]


def _stem(t: str) -> str:
    # Crude Uzbek stem: a 4-char prefix matches ildiz/ildizga/ildizlar etc.
    return t[:4]


def _hit(key: str, tokens: set[str], stems: set[str]) -> bool:
    return key in tokens or (len(key) >= 4 and _stem(key) in stems)


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def _default_rubric(model_answer: str, max_score: float) -> list[dict]:
    """A single-criterion rubric derived from the model answer (used when an
    assignment has no explicit rubric)."""
    return [{
        "criterion": "Mazmun va to'g'rilik",
        "max_points": max_score,
        "description": model_answer or "",
    }]


def _evidence_for(keywords: list[str], sentences: list[str]) -> str:
    """The single sentence of the answer that best matches the criterion's keys."""
    if not sentences:
        return ""
    kset = set(keywords)
    kstems = {_stem(k) for k in keywords if len(k) >= 4}
    best, best_hits = "", 0
    for s in sentences:
        stoks = set(_tokens(s))
        sstems = {_stem(t) for t in stoks if len(t) >= 4}
        hits = len(stoks & kset) + len(sstems & kstems)
        if hits > best_hits:
            best_hits, best = hits, s
    return best if best_hits > 0 else ""


def _grade_criterion(criterion: dict, model_answer: str, answer: str, sentences: list[str], tokens: set[str]) -> dict:
    max_points = float(criterion.get("max_points", 1) or 1)
    name = criterion.get("criterion") or "Mezon"
    keys = _keywords((criterion.get("description") or "") + " " + (model_answer or ""))

    if not answer.strip():
        return {
            "criterion": name, "points_given": 0.0, "max_points": max_points,
            "evidence": "", "suggestion": "Javob bo'sh — bu mezon bo'yicha yozing.",
            "_confidence": 35.0,
        }

    if keys:
        stems = {_stem(t) for t in tokens if len(t) >= 4}
        matched = [k for k in keys if _hit(k, tokens, stems)]
        missing = [k for k in keys if not _hit(k, tokens, stems)]
        coverage = len(matched) / len(keys)
        evidence = _evidence_for(matched or keys, sentences)
    else:
        matched, missing = [], []
        coverage = min(1.0, len(answer.split()) / 30.0)
        evidence = sentences[0] if sentences else ""

    length_ok = len(answer.split()) >= 6
    points = coverage * max_points
    if length_ok and points < max_points:
        points = min(max_points, points + 0.1 * max_points)
    points = round(points, 1)

    if missing:
        suggestion = "Quyidagilarni yoriting: " + ", ".join(missing[:4]) + "."
    elif coverage >= 0.8:
        suggestion = "Bu mezon yaxshi yoritilgan."
    else:
        suggestion = "Javobni misol va tafsilot bilan kengaytiring."

    # Confidence: clear when keywords are found and the answer is substantive.
    confidence = _clamp(55 + coverage * 40 + (5 if length_ok else -20))

    return {
        "criterion": name, "points_given": points, "max_points": max_points,
        "evidence": evidence, "suggestion": suggestion, "_confidence": confidence,
    }


def _rule_based(prompt: str, model_answer: str, answer: str, max_score: float, rubric: list[dict]) -> dict:
    sentences = _sentences(answer)
    tokens = set(_tokens(answer))
    rows = [_grade_criterion(c, model_answer, answer, sentences, tokens) for c in rubric]

    raw_total = round(sum(r["points_given"] for r in rows), 1)
    raw_max = round(sum(r["max_points"] for r in rows), 1) or 1.0
    confidence = int(round(sum(r["_confidence"] for r in rows) / len(rows))) if rows else 100
    breakdown = [{k: v for k, v in r.items() if k != "_confidence"} for r in rows]

    # Scale to the question's max_score so the overall grade math stays consistent.
    score = round(raw_total / raw_max * max_score, 1)
    pct = round(score / max_score * 100) if max_score else 0
    suggestions = [r["suggestion"] for r in breakdown if r["suggestion"]][:4]

    return {
        "rubric_breakdown": breakdown,
        "total": raw_total,
        "max_total": raw_max,
        "confidence": confidence,
        "needs_review": confidence < REVIEW_THRESHOLD,
        "score": score,
        "max": max_score,
        "rationale": f"Qoidaga-asoslangan rubrika bahosi (~{pct}%), har mezon dalili bilan.",
        "suggestions": suggestions,
        "provider": "fallback",
    }


def _from_llm(data: dict, max_score: float, rubric: list[dict]) -> dict | None:
    """Validate + normalise the LLM's structured rubric grade. None on bad shape."""
    rows_in = data.get("rubric_breakdown")
    if not isinstance(rows_in, list) or not rows_in:
        return None
    breakdown: list[dict] = []
    for i, r in enumerate(rows_in):
        if not isinstance(r, dict):
            return None
        ref = rubric[i] if i < len(rubric) else {}
        try:
            mx = float(r.get("max_points", ref.get("max_points", 1)) or 1)
            pts = _clamp(float(r.get("points_given", 0)), 0.0, mx)
        except (TypeError, ValueError):
            return None
        breakdown.append({
            "criterion": str(r.get("criterion") or ref.get("criterion") or f"Mezon {i + 1}"),
            "points_given": round(pts, 1),
            "max_points": round(mx, 1),
            "evidence": str(r.get("evidence") or "").strip(),
            "suggestion": str(r.get("suggestion") or "").strip(),
        })

    raw_total = round(sum(r["points_given"] for r in breakdown), 1)
    raw_max = round(sum(r["max_points"] for r in breakdown), 1) or 1.0
    try:
        confidence = int(_clamp(float(data.get("confidence", 75))))
    except (TypeError, ValueError):
        confidence = 75
    score = round(raw_total / raw_max * max_score, 1)
    suggestions = [r["suggestion"] for r in breakdown if r["suggestion"]][:4]
    return {
        "rubric_breakdown": breakdown,
        "total": raw_total,
        "max_total": raw_max,
        "confidence": confidence,
        "needs_review": confidence < REVIEW_THRESHOLD,
        "score": score,
        "max": max_score,
        "rationale": str(data.get("rationale") or "AI rubrika bahosi.").strip(),
        "suggestions": suggestions,
        "provider": "ollama",
    }


async def grade_open_answer(
    *, prompt: str, model_answer: str, student_answer: str, max_score: float,
    rubric: list[dict] | None = None,
) -> dict:
    """Grade one open answer against a rubric. Returns per-criterion points with
    evidence, a confidence score and a needs_review flag (Uzbek)."""
    rubric = rubric or _default_rubric(model_answer, max_score)
    answer = student_answer or ""

    system = (
        "Siz tajribali, xolis o'qituvchi-baholovchisiz. Talaba javobini berilgan "
        "RUBRIKA mezonlari bo'yicha baholang. Har mezon uchun: ball bering, javobning "
        "AYNAN qaysi qismi shu ballni oqlaganini 'evidence' sifatida ko'chiring va qisqa "
        "tavsiya yozing. FAQAT JSON qaytaring: "
        '{"rubric_breakdown":[{"criterion":"...","points_given":<son>,"max_points":<son>,'
        '"evidence":"<javobdan ko\'chirma>","suggestion":"<tavsiya>"}],"confidence":<0..100>}. '
        "Matnlar o'zbek tilida. 'confidence' — bahoga qanchalik ishonchingiz."
    )
    rubric_view = [
        {"criterion": c.get("criterion"), "max_points": c.get("max_points"), "description": c.get("description")}
        for c in rubric
    ]
    shown_answer = answer or "(bo'sh)"
    user = (
        f"SAVOL: {prompt}\n"
        f"NAMUNAVIY JAVOB: {model_answer or '(berilmagan)'}\n"
        f"RUBRIKA: {rubric_view}\n"
        f"TALABA JAVOBI: {shown_answer}"
    )
    data = await generate_json(system, user)
    if data:
        parsed = _from_llm(data, max_score, rubric)
        if parsed:
            return parsed
    return _rule_based(prompt, model_answer, answer, max_score, rubric)


async def draft_feedback(*, student_name: str, subject: str, score_pct: int, weak_points: list[str]) -> dict:
    """Draft a short Uzbek feedback message a teacher can edit and send."""
    system = (
        "Siz g'amxo'r o'qituvchisiz. Talabaga qisqa, ijobiy va aniq feedback yozing. "
        'FAQAT JSON qaytaring: {"comment": "<o\'zbekcha 2-3 gap>"}.'
    )
    user = (
        f"Talaba: {student_name}\nFan: {subject}\nNatija: {score_pct}%\n"
        f"Zaif tomonlar: {', '.join(weak_points) or 'aniqlanmadi'}"
    )
    data = await generate_json(system, user)
    if data and data.get("comment"):
        return {"comment": str(data["comment"]).strip(), "provider": "ollama"}

    # Fallback template.
    if score_pct >= 80:
        tone = f"{student_name}, ajoyib natija ({score_pct}%)! Shu zarbni saqlang."
    elif score_pct >= 50:
        tone = f"{student_name}, yaxshi harakat ({score_pct}%). Yana bir oz mehnat kerak."
    else:
        tone = f"{student_name}, natija ({score_pct}%) pastroq — birga mustahkamlaymiz."
    if weak_points:
        tone += " Diqqat qiling: " + ", ".join(weak_points[:3]) + "."
    return {"comment": tone, "provider": "fallback"}
