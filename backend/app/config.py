"""Application settings — loaded from environment / .env."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "baholAI"
    app_env: str = "development"
    app_port: int = 8002
    app_debug: bool = True

    # CORS — the baholAI frontend (and any extra embed consumers)
    frontend_origin: str = "http://localhost:5175"
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    database_url: str = "sqlite+aiosqlite:///./baholai.db"

    # Production single-service deploy: serve the built frontend from this dir
    # (empty = API only, for local dev with Vite). Auto-seed demo data if the DB
    # is empty (so a fresh cloud deploy has working demo accounts).
    static_dir: str = ""
    auto_seed: bool = False

    # Simple opaque-token auth (sessions live in the DB). Basic on purpose.
    token_ttl_days: int = 30

    # ---- AI (sun'iy intellekt) — SEPARATE section -----------------------
    # Local-first LLM via Ollama. When the daemon is unreachable the grader
    # transparently falls back to a deterministic, rule-based scorer so the
    # demo always works without any model installed.
    ai_enabled: bool = True
    ollama_url: str = "http://localhost:11434"
    ai_model: str = "llama3.1"          # swap for a local Uzbek model later
    ai_language: str = "uz"             # explanations/feedback language
    ai_timeout_seconds: float = 30.0

    @property
    def allowed_origins(self) -> list[str]:
        extras = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return [self.frontend_origin, *extras]


@lru_cache
def get_settings() -> Settings:
    return Settings()
