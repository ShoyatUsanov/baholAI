# baholAI — loyiha konteksti (Claude uchun prompt asosi)

> Bu faylni boshqa suhbatlarda Claude'ga **kontekst** sifatida nusxalab, so'ng aniq
> vazifani qo'shing. Masalan: *"...baholAI loyihasiga o'qituvchi statistikasiga
> fan bo'yicha grafik qo'sh."*

## Nima bu?
**baholAI** — barcha fan o'qituvchilari uchun **AI yordamida avtomatik baholash,
feedback va analitika** platformasi (Andijon hackathoni, "Smart Edu — Raqamli
Ta'lim"). O'qituvchi vaqtini tejaydi, baholashni obyektiv/shaffof qiladi, feedback
zanjirini (o'qituvchi → o'quvchi → analitika) yopadi.

## Texnologiyalar
- **Backend:** Python FastAPI + SQLAlchemy 2.0 (async) + SQLite (`aiosqlite`). Port **8002**.
- **Frontend:** React 19 + Vite 6 + TypeScript + Tailwind 4 + react-router 7 + lucide. Port **5175**.
- **AI:** Mahalliy LLM **Ollama** (`qwen2.5:3b` asosidagi `baholai`) + **rule-based fallback**.
  Hozir `.env`da `AI_ENABLED=false` (fallback rejim, demo uchun tez).
- Repo: https://github.com/ShoyatUsanov/baholAI (public)

## Arxitektura
```
backend/  FastAPI + SQLAlchemy + SQLite (async)
  app/
    ai/         🤖 Ollama (provider.py) + grader.py + rule-based fallback
    models/     barcha entity'lar (__init__.py)
    routers/    auth, subjects, assignments, submissions, feedback,
                analytics, ai, admin, meta, users, learning, ops, public_api
    services/   grading (obyektiv), methods, analytics, srs
    db.py       async engine, Base, init_db (create_all)
    serialize.py  plain-dict serializerlar
  seed.py       demo seederlar (8 fan)
frontend/  React 19 + Vite + Tailwind 4
  src/pages/  student / teacher / admin / learning / shared
  src/lib/    api.ts, auth.ts, types.ts
```

## Ma'lumotlar modeli (24 entity)
`Institution, Subject, User, Group, Assignment, Submission, Grade, Feedback,
Activity, Attendance, ScheduleEntry, Payment, Message, Notification, Announcement,
Collection, Lesson, Deck, Flashcard, CardProgress, Test, TestResult, ApiKey, Session`

## Rollar va imkoniyatlar
- **O'quvchi:** bosh sahifa, fanlar/darslar, vazifa bajarish, flashcards (SRS),
  testlar, feedback, faollik/XP/daraja, davomat, jadval, to'lovlar, xabarlar.
- **O'qituvchi:** boshqaruv, vazifa yaratish (7 interaktiv usul), baholash + feedback
  (har savol javobi, AI taklif), **Statistika** (kim qildi/qilmadi + o'quvchi tahlili),
  to'plamlar/flashcards/testlar, guruhlar, davomat, jadval, e'lonlar, to'lovlar.
- **Admin:** umumiy ko'rinish, muassasalar, foydalanuvchilar, fanlar, API kalitlar.

## Baholash mantig'i (muhim!)
- **Obyektiv savollar** (variant, to'g'ri/noto'g'ri, bo'sh joy) → AI'siz, deterministik (`services/grading.py`).
- **Ochiq savollar** (qisqa javob, insho) → AI baholaydi (`ai/grader.py`), o'zbekcha izoh + tavsiya.
- Natija shaffof **breakdown**: har savol uchun ball, `graded_by` (auto/ai), to'g'ri javob, izoh.

## Interaktiv usullar (7 ta)
Standart · Geymifikatsiya · Kviz-jang · O'zaro baholash · Teskari sinf · Loyiha asosida · Munozara

## Demo hisoblar (seed)
| Rol | Login | Parol |
|---|---|---|
| Superadmin | `admin` | `admin123` |
| Muassasa admini | `rector` | `rector123` |
| O'qituvchi | `teacher_matematika` … | `teacher123` |
| O'quvchi | `student1` … `student6` | `student123` |

## Tashqi API (`/api/v1`, API kalit bilan)
```bash
curl http://localhost:8002/api/v1/subjects -H "X-API-Key: bk_..."
curl http://localhost:8002/api/v1/analytics/overview -H "X-API-Key: bk_..."
```

## Ishga tushirish
```bash
# Backend (8002)
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8002
# Frontend (5175)
cd frontend && npm run dev
```

## Xavfsizlik qoidasi
`.env`, `*.db`, `node_modules/` GitHub'ga **hech qachon** yuklanmaydi (`.gitignore`da).
Faqat `backend/.env.example` (placeholder) repoda.

## Hozirgi holat
Ishlaydigan "basic" poydevor. So'nggi qo'shilgan: o'qituvchi statistikasi,
baholashda javoblarni ko'rish. Rejada: STT/TTS (o'zbekcha nutq↔matn), jonli
kviz-jang reytingi, chatbot/AI-agent, ko'p-tilli UI, JWT/parol-hash, Alembic, testlar.
