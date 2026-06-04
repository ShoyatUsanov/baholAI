"""Learning content — collections (to'plamlar), lessons, decks, flashcards
(SM-2 study) and self-study tests. Shared across every subject."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user, require_roles
from app.models import (
    Activity,
    CardProgress,
    Collection,
    Deck,
    Flashcard,
    Lesson,
    Subject,
    Test,
    TestResult,
    User,
    now,
)
from app.schemas import CardReviewIn, CollectionIn, DeckIn, LessonIn, TestIn, TestSubmitIn
from app.serialize import (
    collection_out,
    deck_out,
    flashcard_out,
    lesson_out,
    test_out,
    test_result_out,
)
from app.services.grading import grade_submission
from app.services.srs import review as srs_review

router = APIRouter()
TEACHER = require_roles("teacher", "institution_admin", "superadmin")


# ---- Collections --------------------------------------------------------
@router.get("/collections")
async def list_collections(subject_id: int | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(Collection).order_by(Collection.order_idx, Collection.id)
    if subject_id:
        q = q.where(Collection.subject_id == subject_id)
    cols = (await db.execute(q)).scalars().all()
    out = []
    for c in cols:
        n = await db.scalar(select(func.count()).select_from(Lesson).where(Lesson.collection_id == c.id))
        out.append(collection_out(c, lesson_count=n or 0))
    return out


@router.get("/collections/{cid}")
async def get_collection(cid: int, db: AsyncSession = Depends(get_db)) -> dict:
    c = await db.get(Collection, cid)
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "to'plam topilmadi")
    lessons = (await db.execute(select(Lesson).where(Lesson.collection_id == cid).order_by(Lesson.order_idx))).scalars().all()
    decks = (await db.execute(select(Deck).where(Deck.collection_id == cid))).scalars().all()
    tests = (await db.execute(select(Test).where(Test.collection_id == cid))).scalars().all()
    return {
        **collection_out(c, lesson_count=len(lessons)),
        "lessons": [lesson_out(l) for l in lessons],
        "decks": [deck_out(d) for d in decks],
        "tests": [test_out(t) for t in tests],
    }


@router.post("/collections", status_code=status.HTTP_201_CREATED)
async def create_collection(payload: CollectionIn, db: AsyncSession = Depends(get_db), _: User = Depends(TEACHER)) -> dict:
    if not await db.get(Subject, payload.subject_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "fan topilmadi")
    mx = await db.scalar(select(func.coalesce(func.max(Collection.order_idx), -1)).where(Collection.subject_id == payload.subject_id))
    c = Collection(subject_id=payload.subject_id, title=payload.title, description=payload.description,
                   icon=payload.icon, level=payload.level, order_idx=(mx or -1) + 1)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return collection_out(c, lesson_count=0)


# ---- Lessons ------------------------------------------------------------
@router.get("/lessons/{lid}")
async def get_lesson(lid: int, db: AsyncSession = Depends(get_db)) -> dict:
    l = await db.get(Lesson, lid)
    if not l:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "dars topilmadi")
    return lesson_out(l)


@router.post("/lessons", status_code=status.HTTP_201_CREATED)
async def create_lesson(payload: LessonIn, db: AsyncSession = Depends(get_db), _: User = Depends(TEACHER)) -> dict:
    if not await db.get(Collection, payload.collection_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "to'plam topilmadi")
    mx = await db.scalar(select(func.coalesce(func.max(Lesson.order_idx), -1)).where(Lesson.collection_id == payload.collection_id))
    l = Lesson(collection_id=payload.collection_id, title=payload.title, content=payload.content,
               est_minutes=payload.est_minutes, exercises=payload.exercises, order_idx=(mx or -1) + 1)
    db.add(l)
    await db.commit()
    await db.refresh(l)
    return lesson_out(l)


@router.post("/lessons/{lid}/complete")
async def complete_lesson(lid: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    l = await db.get(Lesson, lid)
    if not l:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "dars topilmadi")
    user.xp += 10
    db.add(Activity(user_id=user.id, type="lesson", title=f"Dars yakunlandi: {l.title}", xp=10))
    await db.commit()
    return {"lesson_id": lid, "xp_awarded": 10}


# ---- Decks & flashcards (SM-2 study) ------------------------------------
@router.get("/decks")
async def list_decks(subject_id: int | None = None, collection_id: int | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(Deck)
    if subject_id:
        q = q.where(Deck.subject_id == subject_id)
    if collection_id:
        q = q.where(Deck.collection_id == collection_id)
    decks = (await db.execute(q)).scalars().all()
    out = []
    for d in decks:
        n = await db.scalar(select(func.count()).select_from(Flashcard).where(Flashcard.deck_id == d.id))
        out.append(deck_out(d, card_count=n or 0))
    return out


@router.get("/decks/{did}")
async def get_deck(did: int, db: AsyncSession = Depends(get_db)) -> dict:
    d = await db.get(Deck, did)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "to'plam topilmadi")
    cards = (await db.execute(select(Flashcard).where(Flashcard.deck_id == did).order_by(Flashcard.order_idx))).scalars().all()
    return {**deck_out(d, card_count=len(cards)), "cards": [flashcard_out(c) for c in cards]}


@router.post("/decks", status_code=status.HTTP_201_CREATED)
async def create_deck(payload: DeckIn, db: AsyncSession = Depends(get_db), user: User = Depends(TEACHER)) -> dict:
    d = Deck(subject_id=payload.subject_id, collection_id=payload.collection_id,
             title=payload.title, description=payload.description, owner_id=user.id)
    db.add(d)
    await db.flush()
    for i, c in enumerate(payload.cards):
        db.add(Flashcard(deck_id=d.id, front=c.get("front", ""), back=c.get("back", ""),
                         example=c.get("example"), order_idx=i))
    await db.commit()
    await db.refresh(d)
    return deck_out(d, card_count=len(payload.cards))


@router.get("/decks/{did}/study")
async def study_deck(did: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    cards = (await db.execute(select(Flashcard).where(Flashcard.deck_id == did))).scalars().all()
    prog = {
        p.card_id: p
        for p in (await db.execute(select(CardProgress).where(CardProgress.student_id == user.id))).scalars().all()
    }
    due = []
    for c in cards:
        p = prog.get(c.id)
        if p is None or p.next_review <= now():
            due.append({**flashcard_out(c), "status": p.status if p else "new"})
    return {"deck_id": did, "total": len(cards), "due": due}


@router.post("/flashcards/{card_id}/review")
async def review_card(card_id: int, payload: CardReviewIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    card = await db.get(Flashcard, card_id)
    if not card:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "kartochka topilmadi")
    p = (await db.execute(
        select(CardProgress).where(CardProgress.card_id == card_id, CardProgress.student_id == user.id)
    )).scalar_one_or_none()
    if p is None:
        p = CardProgress(card_id=card_id, student_id=user.id)
        db.add(p)
    r = srs_review(p.easiness, p.interval, p.repetitions, payload.quality)
    p.easiness, p.interval, p.repetitions = r["easiness"], r["interval"], r["repetitions"]
    p.status, p.next_review = r["status"], r["next_review"]
    user.xp += 2
    await db.commit()
    return {"card_id": card_id, "status": p.status, "interval_days": p.interval, "next_review": p.next_review.isoformat()}


# ---- Tests (self-study) -------------------------------------------------
@router.get("/tests")
async def list_tests(subject_id: int | None = None, collection_id: int | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(Test).order_by(Test.created_at.desc())
    if subject_id:
        q = q.where(Test.subject_id == subject_id)
    if collection_id:
        q = q.where(Test.collection_id == collection_id)
    return [test_out(t) for t in (await db.execute(q)).scalars().all()]


@router.get("/tests/{tid}")
async def get_test(tid: int, db: AsyncSession = Depends(get_db)) -> dict:
    t = await db.get(Test, tid)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "test topilmadi")
    return test_out(t)  # answers stripped


@router.post("/tests", status_code=status.HTTP_201_CREATED)
async def create_test(payload: TestIn, db: AsyncSession = Depends(get_db), user: User = Depends(TEACHER)) -> dict:
    t = Test(subject_id=payload.subject_id, collection_id=payload.collection_id, title=payload.title,
             duration_minutes=payload.duration_minutes, is_final=payload.is_final,
             questions=payload.questions, created_by=user.id)
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return test_out(t, with_answers=True)


@router.post("/tests/{tid}/submit", status_code=status.HTTP_201_CREATED)
async def submit_test(tid: int, payload: TestSubmitIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    t = await db.get(Test, tid)
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "test topilmadi")
    result = await grade_submission(t.questions or [], payload.answers or {})
    wrong = [b for b in result["breakdown"] if b["score"] < b["max"]]
    tr = TestResult(test_id=tid, student_id=user.id, score=result["total_score"],
                    total=result["max_score"], time_spent=payload.time_spent, wrong=wrong)
    db.add(tr)
    pct = round(result["total_score"] / result["max_score"] * 100) if result["max_score"] else 0
    user.xp += pct
    db.add(Activity(user_id=user.id, type="test", title=f"Test: {t.title}", score=pct, xp=pct))
    await db.commit()
    await db.refresh(tr)
    return {**test_result_out(tr), "breakdown": result["breakdown"], "ai_provider": result["ai_provider"]}


@router.get("/test-results")
async def list_test_results(student_id: int | None = None, test_id: int | None = None, db: AsyncSession = Depends(get_db)) -> list[dict]:
    q = select(TestResult).order_by(TestResult.completed_at.desc())
    if student_id:
        q = q.where(TestResult.student_id == student_id)
    if test_id:
        q = q.where(TestResult.test_id == test_id)
    return [test_result_out(r) for r in (await db.execute(q)).scalars().all()]
