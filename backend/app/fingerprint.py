"""Semantic fingerprinting — reuse a saved "typical" answer's ready feedback
for new, similar answers instead of re-grading every time.

Fallback-first: a rule-based bag-of-words TF vector + cosine works with no model
installed. When the local LLM is enabled, an Ollama embedding is used instead;
both stored and query vectors come from the same function, so types always match.
"""
from __future__ import annotations

import math
from collections import Counter

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import AnswerFingerprint
from app.originality import normalize

settings = get_settings()

STRONG_MATCH = 0.85  # cosine >= this → reuse the saved feedback


def _bow_vector(text: str) -> dict[str, int]:
    """Rule-based embedding: term frequency over content words (>2 chars)."""
    tokens = [t for t in normalize(text).split() if len(t) > 2]
    return dict(Counter(tokens))


async def _ollama_embedding(text: str) -> list[float] | None:
    try:
        async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
            r = await client.post(
                f"{settings.ollama_url}/api/embeddings",
                json={"model": settings.ai_model, "prompt": text},
            )
            r.raise_for_status()
            emb = r.json().get("embedding")
        return emb if isinstance(emb, list) and emb else None
    except Exception:
        return None


async def text_vector(text: str):
    """Embedding for `text`. Ollama vector when AI is enabled, else BoW dict."""
    if settings.ai_enabled:
        emb = await _ollama_embedding(text or "")
        if emb:
            return emb
    return _bow_vector(text or "")


def cosine(a, b) -> float:
    """Cosine similarity (0..1) for two BoW dicts or two dense lists."""
    if isinstance(a, dict) or isinstance(b, dict):
        a = a if isinstance(a, dict) else {}
        b = b if isinstance(b, dict) else {}
        if not a or not b:
            return 0.0
        dot = sum(v * b.get(k, 0) for k, v in a.items())
        ma = math.sqrt(sum(v * v for v in a.values()))
        mb = math.sqrt(sum(v * v for v in b.values()))
        return dot / (ma * mb) if ma and mb else 0.0
    n = min(len(a), len(b))
    if n == 0:
        return 0.0
    dot = sum(a[i] * b[i] for i in range(n))
    ma = math.sqrt(sum(x * x for x in a))
    mb = math.sqrt(sum(x * x for x in b))
    return dot / (ma * mb) if ma and mb else 0.0


async def match_fingerprint(
    db: AsyncSession, assignment_id: int, question_index: int, answer: str
) -> dict | None:
    """Best saved fingerprint for this question + how similar (0..1). None if no
    fingerprints exist for the question."""
    fps = (
        await db.execute(
            select(AnswerFingerprint).where(
                AnswerFingerprint.assignment_id == assignment_id,
                AnswerFingerprint.question_index == question_index,
            )
        )
    ).scalars().all()
    if not fps or not (answer or "").strip():
        return None

    vec = await text_vector(answer)
    best, best_sim = None, 0.0
    for fp in fps:
        sim = cosine(vec, fp.vector or {})
        if sim > best_sim:
            best_sim, best = sim, fp
    if best is None:
        return None
    return {"fingerprint": best, "similarity": best_sim}
