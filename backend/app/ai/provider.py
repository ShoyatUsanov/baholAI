"""Local LLM provider — Ollama over HTTP, with graceful absence handling.

Nothing here raises on a missing/unreachable daemon: callers get `None` and
switch to the deterministic fallback. Swap `ai_model` in settings for a local
Uzbek model (e.g. a llama-based one) when available.
"""
from __future__ import annotations

import json

import httpx

from app.config import get_settings

settings = get_settings()


async def ai_status() -> dict:
    """Report whether the local LLM is reachable and which models exist."""
    if not settings.ai_enabled:
        return {"enabled": False, "provider": "fallback", "reachable": False, "models": []}
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{settings.ollama_url}/api/tags")
            r.raise_for_status()
            models = [m.get("name", "") for m in r.json().get("models", [])]
        return {
            "enabled": True,
            "provider": "ollama",
            "reachable": True,
            "url": settings.ollama_url,
            "model": settings.ai_model,
            "models": models,
        }
    except Exception:
        return {
            "enabled": True,
            "provider": "fallback",
            "reachable": False,
            "url": settings.ollama_url,
            "model": settings.ai_model,
            "models": [],
        }


async def generate_json(system: str, prompt: str) -> dict | None:
    """Ask the local LLM for a JSON object. Returns None if unavailable/invalid."""
    if not settings.ai_enabled:
        return None
    payload = {
        "model": settings.ai_model,
        "system": system,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.2},
    }
    try:
        async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
            r = await client.post(f"{settings.ollama_url}/api/generate", json=payload)
            r.raise_for_status()
            raw = r.json().get("response", "").strip()
        return json.loads(raw)
    except Exception:
        return None
