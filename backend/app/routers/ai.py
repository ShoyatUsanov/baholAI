"""AI (sun'iy intellekt) bo'limi — status, ochiq javobni baholash, feedback loyihasi.

Bu router sun'iy-intellektga oid hamma endpointlarni bir joyga to'playdi
(talab: AI kerak bo'ladiganlarni alohida bo'limga ajratish).
"""
from __future__ import annotations

from fastapi import APIRouter

from app.ai import ai_status, draft_feedback, grade_open_answer
from app.schemas import AiFeedbackIn, AiGradeIn

router = APIRouter()


@router.get("/status")
async def status() -> dict:
    """Is the local LLM (Ollama) reachable? Which provider will be used?"""
    return await ai_status()


@router.post("/grade")
async def grade(payload: AiGradeIn) -> dict:
    """Grade a single open-ended answer with the local LLM (or fallback)."""
    return await grade_open_answer(
        prompt=payload.prompt,
        model_answer=payload.model_answer,
        student_answer=payload.student_answer,
        max_score=payload.max_score,
    )


@router.post("/feedback")
async def feedback(payload: AiFeedbackIn) -> dict:
    """Draft an Uzbek feedback message the teacher can edit before sending."""
    return await draft_feedback(
        student_name=payload.student_name,
        subject=payload.subject,
        score_pct=payload.score_pct,
        weak_points=payload.weak_points,
    )
