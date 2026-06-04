"""Originality — a SIGNAL for the teacher, never an automatic penalty.

Two independent checks run on each submission's free-text answers:
  1. similarity  — group copy-paste detection: char-level 5-gram shingling +
     Jaccard against every other submission of the same assignment.
  2. ai_likelihood — a transparent, rule-based proxy for "reads as machine
     written" (burstiness, lexical diversity, connector density). When the local
     LLM is enabled it is blended with an Ollama estimate; otherwise rule-based
     only, so the platform works with no model installed.

Mirrors the AI section's local-first / graceful-fallback philosophy. The teacher
always makes the final call.
"""
from __future__ import annotations

import re
import statistics

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.provider import generate_json
from app.config import get_settings
from app.models import OriginalityReport, Submission

settings = get_settings()

SHINGLE_K = 5
SIMILARITY_FLAG = 60        # similarity >= this → flagged
AI_FLAG = 70               # ai_likelihood >= this → flagged
MATCH_THRESHOLD = 40       # pairwise similarity > this → counts as a match

_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
_WS_RE = re.compile(r"\s+", re.UNICODE)
_WORD_RE = re.compile(r"[\wʻʼ'`-]+", re.UNICODE)
_SENT_RE = re.compile(r"[.!?\n]+")

# Linking phrases an LLM over-uses; high density is a weak AI tell.
_CONNECTORS = [
    "shuningdek", "bundan tashqari", "xulosa qilib", "shu bilan birga",
    "birinchidan", "ikkinchidan", "uchinchidan", "qolaversa", "natijada",
    "umuman olganda", "boshqacha aytganda", "shunday qilib",
]


def normalize(text: str) -> str:
    """lowercase, drop punctuation, collapse whitespace to single spaces."""
    text = (text or "").lower()
    text = _PUNCT_RE.sub(" ", text)
    return _WS_RE.sub(" ", text).strip()


def _shingles(text: str, k: int = SHINGLE_K) -> set[str]:
    norm = normalize(text)
    if len(norm) < k:
        return {norm} if norm else set()
    return {norm[i : i + k] for i in range(len(norm) - k + 1)}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def submission_text(submission: Submission) -> str:
    """Join a submission's free-text answers into one blob (stable order)."""
    answers = submission.answers or {}
    parts: list[str] = []
    for qid in sorted(answers.keys()):
        val = answers[qid]
        if isinstance(val, str):
            parts.append(val)
        elif isinstance(val, (list, tuple)):
            parts.append(" ".join(str(v) for v in val))
    return "\n".join(p for p in parts if p.strip())


def similarity_check(text: str, others: list[tuple[int, str]]) -> tuple[int, list[int], list[dict]]:
    """Compare `text` to every other submission's text.

    Returns (similarity, matched_submission_ids, top3) where similarity is the
    single highest overlap (0..100) and matches are those above MATCH_THRESHOLD,
    strongest first.
    """
    target = _shingles(text)
    scored: list[tuple[int, int]] = []
    for sub_id, other_text in others:
        pct = round(_jaccard(target, _shingles(other_text)) * 100)
        scored.append((sub_id, pct))
    scored.sort(key=lambda x: x[1], reverse=True)

    similarity = scored[0][1] if scored else 0
    matched = [sid for sid, pct in scored if pct > MATCH_THRESHOLD]
    top3 = [{"submission_id": sid, "similarity": pct} for sid, pct in scored[:3]]
    return similarity, matched, top3


def _clamp(value: float) -> int:
    return int(max(0.0, min(100.0, value)))


def _rule_based_ai_likelihood(text: str) -> int:
    """0..100 proxy for machine-written prose. Higher = more AI-like.

    Only substantive sentences (>= 4 words) are considered, so short objective
    answers don't distort the prose signals.
    """
    sentences = [s.strip() for s in _SENT_RE.split(text or "") if len(_WORD_RE.findall(s)) >= 4]
    if len(sentences) < 2:
        return 0  # too little prose to judge — stay silent rather than guess
    words = [w.lower() for w in _WORD_RE.findall(" ".join(sentences))]
    if len(words) < 12:
        return 0

    # 1) Burstiness: humans vary sentence length, LLMs are uniform.
    lengths = [len(_WORD_RE.findall(s)) for s in sentences]
    mean = statistics.mean(lengths)
    std = statistics.pstdev(lengths)
    cv = (std / mean) if mean else 0.0
    burstiness = _clamp((1.0 - cv) * 100.0)  # uniform (cv→0) → high

    # 2) Lexical diversity: distance from a natural band (~0.65). Very high
    #    (every word unique) or very low (heavy repetition) are both suspicious.
    diversity = len(set(words)) / len(words)
    lexical = _clamp(abs(diversity - 0.65) / 0.40 * 100.0)

    # 3) Connector density: LLMs over-link clauses (counted once per phrase).
    padded = f" {normalize(text)} "
    connector_hits = sum(padded.count(f" {normalize(c)} ") for c in _CONNECTORS)
    connectors = _clamp(connector_hits / len(sentences) * 120.0)

    return _clamp((burstiness + lexical + connectors) / 3.0)


async def ai_likelihood(text: str) -> int:
    """Rule-based score, optionally blended with the local LLM when enabled."""
    rule = _rule_based_ai_likelihood(text)
    if not settings.ai_enabled or not (text or "").strip():
        return rule

    system = (
        "Siz matnning sun'iy intellekt (AI) tomonidan yozilgan ehtimolini "
        "baholaysiz. FAQAT JSON qaytaring: {\"ai_likelihood\": <0..100 son>}."
    )
    data = await generate_json(system, f"MATN:\n{text}")
    if data and "ai_likelihood" in data:
        try:
            llm = max(0.0, min(100.0, float(data["ai_likelihood"])))
            return _clamp((rule + llm) / 2.0)
        except (TypeError, ValueError):
            return rule
    return rule


async def build_report(submission_id: int, session: AsyncSession) -> OriginalityReport | None:
    """Compute (or refresh) the originality report for one submission.

    Adds/updates the row in the session and flushes; the caller owns the commit.
    """
    sub = await session.get(Submission, submission_id)
    if not sub:
        return None

    rows = (
        await session.execute(
            select(Submission).where(
                Submission.assignment_id == sub.assignment_id,
                Submission.id != sub.id,
            )
        )
    ).scalars().all()
    others = [(s.id, submission_text(s)) for s in rows]

    text = submission_text(sub)
    similarity, matched, _top3 = similarity_check(text, others)
    ai_like = await ai_likelihood(text)
    flagged = similarity >= SIMILARITY_FLAG or ai_like >= AI_FLAG

    report = (
        await session.execute(
            select(OriginalityReport).where(OriginalityReport.submission_id == submission_id)
        )
    ).scalar_one_or_none()
    if report is None:
        report = OriginalityReport(submission_id=submission_id)
        session.add(report)

    report.similarity = similarity
    report.ai_likelihood = ai_like
    report.matched_submission_ids = matched
    report.flagged = flagged
    await session.flush()
    return report
