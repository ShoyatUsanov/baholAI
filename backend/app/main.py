"""baholAI — FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.db import init_db
from app.routers import (
    admin,
    ai,
    analytics,
    appeals,
    assignments,
    auth,
    billing,
    feedback,
    fingerprints,
    learning,
    meta,
    notifications,
    ops,
    public_api,
    subjects,
    submissions,
    teacher,
    users,
)

settings = get_settings()


async def _seed_if_empty() -> None:
    """Populate demo data on a fresh deploy so judges land on a working app."""
    from sqlalchemy import func, select

    from app.db import SessionLocal
    from app.models import User

    async with SessionLocal() as session:
        count = (await session.execute(select(func.count()).select_from(User))).scalar() or 0
    if count == 0:
        from seed import run as seed_run  # backend/seed.py
        await seed_run()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    if settings.auto_seed:
        try:
            await _seed_if_empty()
        except Exception as exc:  # never block startup on seeding
            print(f"[seed] skipped: {exc}")
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", debug=settings.app_debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(subjects.router, prefix="/api/subjects", tags=["subjects"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["assignments"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["submissions"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["feedback"])
app.include_router(appeals.router, prefix="/api/appeals", tags=["appeals"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(fingerprints.router, prefix="/api/fingerprints", tags=["fingerprints"])
app.include_router(teacher.router, prefix="/api/teacher", tags=["teacher"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(meta.router, prefix="/api/meta", tags=["meta"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(learning.router, prefix="/api/learning", tags=["learning"])
app.include_router(ops.router, prefix="/api/ops", tags=["ops"])
app.include_router(public_api.router, prefix="/api/v1", tags=["public-api"])


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "app": settings.app_name}


# ---- Serve the built frontend (single-service deploy) -------------------
# When STATIC_DIR points at the built frontend, FastAPI serves it from the same
# origin as the API — so /api calls work with no CORS and judges open one URL.
_static = Path(settings.static_dir) if settings.static_dir else None
if _static and _static.is_dir():
    _assets = _static / "assets"
    if _assets.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets)), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404)
        candidate = _static / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(_static / "index.html"))  # SPA fallback
