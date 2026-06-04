"""AI grading of open-ended answers + teacher feedback drafting.

Both functions try the local LLM first and fall back to a transparent
rule-based scorer so the platform is fully functional with no model installed.
All human-facing text is Uzbek (settings.ai_language).
"""
from __future__ import annotations

import re

from app.ai.provider import generate_json
from app.config import get_settings

settings = get_settings()

_WORD_RE = re.compile(r"[\wʻʼ'`-]+", re.UNICODE)
_STOP = {
    "va", "ham", "bu", "u", "shu", "the", "a", "an", "is", "are", "to", "of",
    "in", "on", "for", "uchun", "bilan", " keyin", "yoki", "ya'ni", "lekin",
}


def _tokens(text: str) -> list[str]:
    return [t.lower() for t in _WORD_RE.findall(text or "") if len(t) > 2 and t.lower() not in _STOP]


def _keywords(model_answer: str) -> list[str]:
    seen: list[str] = []
    for t in _tokens(model_answer):
        if t not in seen:
            seen.append(t)
    return seen


def _fallback_grade(prompt: str, model_answer: str, student_answer: str, max_score: float) -> dict:
    """Deterministic, explainable scorer used when no LLM is available."""
    answer = (student_answer or "").strip()
    if not answer:
        return {
            "score": 0.0,
            "max": max_score,
            "rationale": "Javob bo'sh qoldirilgan.",
            "suggestions": ["Savolga yozma javob yozing.", "Asosiy tushunchalarni izohlang."],
            "provider": "fallback",
        }

    keys = _keywords(model_answer)
    student_tokens = set(_tokens(answer))
    matched = [k for k in keys if k in student_tokens]
    missing = [k for k in keys if k not in student_tokens]

    if keys:
        coverage = len(matched) / len(keys)
    else:
        # No reference answer: score by adequacy of length (rough proxy).
        words = len(answer.split())
        coverage = min(1.0, words / 40.0)

    # Small bonus for a substantive answer; never exceed max.
    length_ok = len(answer.split()) >= 8
    score = coverage * max_score
    if length_ok and score < max_score:
        score = min(max_score, score + 0.1 * max_score)
    score = round(score, 1)

    pct = round(score / max_score * 100) if max_score else 0
    rationale = (
        f"Qoidaga-asoslangan baho: kalit tushunchalarning {len(matched)}/{len(keys) or '—'} qismi "
        f"aniqlandi (~{pct}%)."
    )
    suggestions: list[str] = []
    if missing:
        suggestions.append("Quyidagi tushunchalarni qo'shing: " + ", ".join(missing[:5]) + ".")
    if not length_ok:
        suggestions.append("Javobni kengaytiring — kamida 2-3 gap yozing.")
    if not suggestions:
        suggestions.append("Javob yaxshi — misollar bilan mustahkamlang.")

    return {
        "score": score,
        "max": max_score,
        "rationale": rationale,
        "suggestions": suggestions,
        "provider": "fallback",
    }


async def grade_open_answer(
    *, prompt: str, model_answer: str, student_answer: str, max_score: float
) -> dict:
    """Grade one open-ended answer. Returns score/rationale/suggestions in Uzbek."""
    system = (
        "Siz tajribali o'qituvchi va adolatli baholovchisiz. Talaba javobini "
        "berilgan namunaviy javob va savolga qarab baholang. FAQAT JSON qaytaring: "
        '{"score": <0..max oralig\'ida son>, "rationale": "<o\'zbekcha qisqa izoh>", '
        '"suggestions": ["<o\'zbekcha tavsiya>", ...]}. Izoh va tavsiyalar o\'zbek tilida bo\'lsin.'
    )
    sa = student_answer or "(bo'sh)"
    ma = model_answer or "(berilmagan)"
    user = (
        f"SAVOL: {prompt}\n"
        f"NAMUNAVIY JAVOB: {ma}\n"
        f"TALABA JAVOBI: {sa}\n"
        f"MAKSIMAL BALL: {max_score}"
    )
    data = await generate_json(system, user)
    if data and "score" in data:
        try:
            score = max(0.0, min(float(max_score), float(data["score"])))
        except (TypeError, ValueError):
            score = 0.0
        suggestions = data.get("suggestions") or []
        if isinstance(suggestions, str):
            suggestions = [suggestions]
        return {
            "score": round(score, 1),
            "max": max_score,
            "rationale": str(data.get("rationale") or "AI bahosi.").strip(),
            "suggestions": [str(s) for s in suggestions][:5],
            "provider": "ollama",
        }
    return _fallback_grade(prompt, model_answer, student_answer, max_score)


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
