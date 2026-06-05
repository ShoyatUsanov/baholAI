"""Draft → feedback → refine. When a grade has only MINOR, fixable mistakes the
AI asks the student a targeted concept-check question (CCQ) and lets them resubmit
— so the teacher only ever sees the genuinely hard cases.

Fallback-first: CCQs come from a simple template with no model installed; an Ollama
question is used when the local LLM is enabled.
"""
from __future__ import annotations

from app.ai.provider import generate_json
from app.config import get_settings

settings = get_settings()


def _split_criteria(result: dict) -> tuple[list[dict], list[dict]]:
    """(minor fixable, serious) from a 3-pass grade result."""
    classed = [c for c in (result.get("rubric_breakdown") or []) if c.get("classification")]
    serious = [c for c in classed if c.get("classification") in ("xato", "yo'q")]
    minor = [c for c in classed if c.get("classification") == "qisman" and c.get("evidence")]
    return minor, serious


def should_coach(result: dict, allow_resubmission: bool, attempt_no: int, max_attempts: int) -> bool:
    """Coach only when there are minor (partial, evidenced) mistakes and NO serious
    ones, resubmission is on, and attempts remain. Serious/conceptual → teacher."""
    if not allow_resubmission or attempt_no >= max_attempts:
        return False
    minor, serious = _split_criteria(result)
    return bool(minor) and not serious


async def generate_ccqs(result: dict, limit: int = 2) -> list[dict]:
    """Targeted concept-check questions for the minor criteria (friendly Uzbek)."""
    minor, _ = _split_criteria(result)
    system = (
        "Siz g'amxo'r o'qituvchisiz. Talabaning deyarli to'g'ri javobidagi kichik kamchilik "
        "uchun bitta qisqa, do'stona, aniqlovchi savol bering (javobni o'zi tuzatsin). "
        'FAQAT JSON: {"question": "<o\'zbekcha savol>"}.'
    )
    out: list[dict] = []
    for c in minor[:limit]:
        crit = c.get("criterion") or "Mezon"
        sugg = (c.get("suggestion") or "").strip()
        question = ""
        if settings.ai_enabled:
            data = await generate_json(system, f"MEZON: {crit}\nKAMCHILIK: {sugg}")
            if data and data.get("question"):
                question = str(data["question"]).strip()
        if not question:
            tail = f" {sugg}" if sugg else ""
            question = f"«{crit}» bo'yicha javobingizni biroz kengaytira olasizmi?{tail}"
        out.append({"criterion": crit, "question_text": question})
    return out
