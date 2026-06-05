"""baholAI — FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    learning,
    meta,
    notifications,
    ops,
    public_api,
    subjects,
    submissions,
    users,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
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
