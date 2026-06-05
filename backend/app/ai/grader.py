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


# Pass-3 scoring: points come ONLY from the classification bucket (no invented
# numbers). Pass-1 buckets and their clarity (how decisive the call is).
CLASS_FACTOR = {"to'liq": 1.0, "qisman": 0.5, "xato": 0.0, "yo'q": 0.0}
CLASS_CLARITY = {"to'liq": 1.0, "yo'q": 0.9, "xato": 0.7, "qisman": 0.5}


def _grade_criterion(criterion: dict, model_answer: str, answer: str, sentences: list[str], tokens: set[str]) -> dict:
    """3-pass check for one rubric criterion: classify → find evidence → score."""
    max_points = float(criterion.get("max_points", 1) or 1)
    name = criterion.get("criterion") or "Mezon"
    keys = _keywords((criterion.get("description") or "") + " " + (model_answer or ""))

    # ---- PASS 1: classification ----
    if not answer.strip():
        classification, matched, missing = "yo'q", [], keys
    elif keys:
        stems = {_stem(t) for t in tokens if len(t) >= 4}
        matched = [k for k in keys if _hit(k, tokens, stems)]
        missing = [k for k in keys if not _hit(k, tokens, stems)]
        coverage = len(matched) / len(keys)
        classification = "to'liq" if coverage >= 0.7 else "qisman" if coverage >= 0.35 else "xato"
    else:
        matched, missing = [], []
        words = len(answer.split())
        classification = "to'liq" if words >= 20 else "qisman" if words >= 6 else "xato"

    # ---- PASS 2: evidence extraction ----
    evidence = ""
    if classification in ("to'liq", "qisman"):
        evidence = _evidence_for(matched or keys, sentences) or (sentences[0] if sentences else "")
    evidence_found = bool(evidence)
    note = "" if evidence_found or classification in ("xato", "yo'q") else "Qo'llab-quvvatlovchi matn topilmadi."
    # No evidence to justify a positive call → cannot fully award (anti-hallucination).
    if classification == "to'liq" and not evidence_found:
        classification = "qisman"

    # ---- PASS 3: points (bucket × max_points only) ----
    points = round(CLASS_FACTOR[classification] * max_points, 1)

    if classification == "yo'q":
        suggestion = "Javob bo'sh — bu mezon bo'yicha yozing."
    elif classification == "xato":
        suggestion = (
            "Bu mezon yoritilmagan. Quyidagilarni qo'shing: " + ", ".join(missing[:4]) + "."
            if missing else "Savolga to'g'ridan-to'g'ri javob bering."
        )
    elif classification == "qisman":
        suggestion = (
            "Quyidagilarni ham yoriting: " + ", ".join(missing[:4]) + "."
            if missing else "Javobni misol va tafsilot bilan kengaytiring."
        )
    else:
        suggestion = "Bu mezon to'liq va aniq yoritilgan."

    return {
        "criterion": name, "classification": classification,
        "points_given": points, "max_points": max_points,
        "evidence": evidence, "evidence_note": note, "suggestion": suggestion,
        "_evidence_found": evidence_found,
    }


def _verify(rows: list[dict]) -> tuple[int, int]:
    """Confidence + evidence coverage from the per-criterion passes."""
    if not rows:
        return 100, 100
    found = sum(1 for r in rows if r["_evidence_found"])
    coverage = round(found / len(rows) * 100)
    clarity = sum(CLASS_CLARITY.get(r["classification"], 0.6) for r in rows) / len(rows)
    confidence = int(_clamp(round(35 + coverage / 100 * 45 + clarity * 20)))
    return confidence, coverage


def _rule_based(prompt: str, model_answer: str, answer: str, max_score: float, rubric: list[dict]) -> dict:
    sentences = _sentences(answer)
    tokens = set(_tokens(answer))
    rows = [_grade_criterion(c, model_answer, answer, sentences, tokens) for c in rubric]

    confidence, coverage = _verify(rows)
    raw_total = round(sum(r["points_given"] for r in rows), 1)
    raw_max = round(sum(r["max_points"] for r in rows), 1) or 1.0
    breakdown = [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]

    # Scale to the question's max_score so the overall grade math stays consistent.
    score = round(raw_total / raw_max * max_score, 1)
    suggestions = [r["suggestion"] for r in breakdown if r["suggestion"]][:4]

    return {
        "rubric_breakdown": breakdown,
        "total": raw_total,
        "max_total": raw_max,
        "confidence": confidence,
        "needs_review": confidence < REVIEW_THRESHOLD or coverage < 50,
        "score": score,
        "max": max_score,
        "rationale": f"3 bosqichli tekshiruv: dalil qamrovi {coverage}%.",
        "suggestions": suggestions,
        "provider": "fallback",
        "verification": {"passes_completed": 3, "evidence_coverage": coverage},
    }


def _from_llm(data: dict, max_score: float, rubric: list[dict]) -> dict | None:
    """Validate + normalise the LLM's structured rubric grade. None on bad shape."""
    rows_in = data.get("rubric_breakdown")
    if not isinstance(rows_in, list) or not rows_in:
        return None
    breakdown: list[dict] = []
    ev_found = 0
    for i, r in enumerate(rows_in):
        if not isinstance(r, dict):
            return None
        ref = rubric[i] if i < len(rubric) else {}
        try:
            mx = float(r.get("max_points", ref.get("max_points", 1)) or 1)
            pts = _clamp(float(r.get("points_given", 0)), 0.0, mx)
        except (TypeError, ValueError):
            return None
        evidence = str(r.get("evidence") or "").strip()
        ratio = pts / mx if mx else 0
        classification = str(r.get("classification") or "").strip() or (
            "to'liq" if ratio >= 0.8 else "qisman" if ratio >= 0.3 else "yo'q" if not evidence else "xato"
        )
        if evidence:
            ev_found += 1
        breakdown.append({
            "criterion": str(r.get("criterion") or ref.get("criterion") or f"Mezon {i + 1}"),
            "classification": classification,
            "points_given": round(pts, 1),
            "max_points": round(mx, 1),
            "evidence": evidence,
            "evidence_note": "" if evidence else "Qo'llab-quvvatlovchi matn topilmadi.",
            "suggestion": str(r.get("suggestion") or "").strip(),
        })

    raw_total = round(sum(r["points_given"] for r in breakdown), 1)
    raw_max = round(sum(r["max_points"] for r in breakdown), 1) or 1.0
    coverage = round(ev_found / len(breakdown) * 100) if breakdown else 0
    try:
        confidence = int(_clamp(float(data.get("confidence", 75))))
    except (TypeError, ValueError):
        confidence = 75
    confidence = min(confidence, int(_clamp(50 + coverage / 2)))  # cap by evidence coverage
    score = round(raw_total / raw_max * max_score, 1)
    suggestions = [r["suggestion"] for r in breakdown if r["suggestion"]][:4]
    return {
        "rubric_breakdown": breakdown,
        "total": raw_total,
        "max_total": raw_max,
        "confidence": confidence,
        "needs_review": confidence < REVIEW_THRESHOLD or coverage < 50,
        "score": score,
        "max": max_score,
        "rationale": str(data.get("rationale") or f"3 bosqichli tekshiruv: dalil qamrovi {coverage}%.").strip(),
        "suggestions": suggestions,
        "provider": "ollama",
        "verification": {"passes_completed": 3, "evidence_coverage": coverage},
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
        "Siz xolis o'qituvchi-baholovchisiz. Har RUBRIKA mezoni uchun 3 bosqich bajaring: "
        "1) KLASSIFIKATSIYA — javobni 'to'liq'/'qisman'/'xato'/'yo'q' ga ajrating; "
        "2) DALIL — javobning AYNAN qaysi qismi shu klassifikatsiyani oqlaydi (ko'chirma); "
        "agar dalil bo'lmasa 'evidence' bo'sh qoldiring; "
        "3) BALL — faqat klassifikatsiyaga ko'ra (to'liq=max, qisman=yarmi, xato/yo'q=0), o'zingizdan o'ylab topmang. "
        "FAQAT JSON: "
        '{"rubric_breakdown":[{"criterion":"...","classification":"to\'liq|qisman|xato|yo\'q",'
        '"points_given":<son>,"max_points":<son>,"evidence":"<javobdan ko\'chirma>","suggestion":"<tavsiya>"}],'
        '"confidence":<0..100>}. Matnlar o\'zbek tilida.'
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
