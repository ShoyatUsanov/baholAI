"""SM-2 spaced-repetition algorithm for flashcards."""
from __future__ import annotations

from datetime import timedelta

from app.models import now


def review(easiness: float, interval: int, repetitions: int, quality: int) -> dict:
    """Apply one SM-2 review. `quality` 0..5 (how well the card was recalled)."""
    quality = max(0, min(5, quality))
    if quality < 3:
        repetitions = 0
        interval = 1
    else:
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * easiness)
        repetitions += 1

    easiness = max(1.3, easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
    status = "known" if repetitions >= 2 and quality >= 4 else "learning"
    return {
        "easiness": round(easiness, 2),
        "interval": interval,
        "repetitions": repetitions,
        "status": status,
        "next_review": now() + timedelta(days=interval),
    }
