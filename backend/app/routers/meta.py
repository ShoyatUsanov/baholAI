"""Meta — interactive methods catalog and question-type reference."""
from __future__ import annotations

from fastapi import APIRouter

from app.services.grading import AI_TYPES, OBJECTIVE_TYPES
from app.services.methods import INTERACTIVE_METHODS

router = APIRouter()


@router.get("/methods")
async def methods() -> list[dict]:
    return INTERACTIVE_METHODS


@router.get("/question-types")
async def question_types() -> dict:
    return {
        "objective": sorted(OBJECTIVE_TYPES),  # auto-graded, no AI
        "ai": sorted(AI_TYPES),                # routed to the AI section
    }
