# baholAI — AI yordamida baholash va feedback platformasi

> **Barcha fan o'qituvchilari uchun** sun'iy intellektli baholash, feedback va
> analitika tizimi. Andijon hackathoni uchun ishlab chiqilgan.
>
> 📅 **Boshlangan sana:** 2026-06-04 · **Holat:** _basic_ (poydevor). To'liq versiya keyingi bosqichda.

---

## 🔗 Jurilar uchun havolalar

| | Havola | Nima beradi |
|---|---|---|
| 💻 **Kod (GitHub)** | [github.com/ShoyatUsanov/baholAI](https://github.com/ShoyatUsanov/baholAI) | Butun manba kodi, README, commit tarixi |
| 🌐 **Jonli demo** | [baholai.onrender.com](https://baholai.onrender.com) | Ishlaydigan sayt (deploy qilingach) |

<!-- DEPLOY QILGACH: jonli demo havolasini o'zingizning Render/Railway manzilingizga almashtiring -->
> ⏳ Bepul serverda birinchi ochilish ~30–60 soniya (server "uyg'onadi"), keyin tez ishlaydi.
> Taqdimotdan oldin havolani bir marta ochib qo'ying. To'liq qo'llanma: **[DEPLOY.md](DEPLOY.md)**.

**Demo akkauntlar:** o'qituvchi `teacher_matematika` / `teacher123` · o'quvchi
`student1` / `student123` · admin `admin` / `admin123`

---

## 🚀 Demo qanday ishga tushadi (jurilar uchun)

Loyiha **bitta Docker xizmati** — backend ham API, ham frontend'ni bitta manzildan
beradi. Online deploy yoki lokal Docker bilan **bitta havola** orqali ishlaydi
(AI fallback rejimida, hech qanday kalit kerak emas). To'liq qo'llanma: **[DEPLOY.md](DEPLOY.md)**.

```bash
docker build -t baholai .   &&   docker run -p 8002:8002 baholai
# Brauzerda: http://localhost:8002
```

**Demo akkauntlar:** o'qituvchi `teacher_matematika`/`teacher123` · o'quvchi
`student1`/`student123` · admin `admin`/`admin123`.

---

## Muammo va yechim

Oliy ta'lim va fan vazirligi yo'nalishlariga ("Smart Edu — Raqamli Ta'lim",
AI yordamida avtomatik baholash va feedback tizimi) mos ravishda:

- O'qituvchilar tekshirish va hujjatlarga ko'p vaqt sarflaydi → **AI avtomatik baholaydi**.
- Baholash bir xil va shaffof emas → **obyektiv (avto) + AI baho alohida, har savol bo'yicha izoh bilan**.
- Feedback uzilib qoladi → **o'qituvchi feedback'i → o'quvchi ko'radi → analitikaga qo'shiladi**.
- Faqat bitta fan → **barcha fanlar bir xil imkoniyatga ega** (Ingliz tili, Matematika, Fizika, ...).

## Asosiy imkoniyatlar (basic)

| # | Talab | Holati |
|---|---|---|
| 1 | Baholashda AI kerak bo'ladiganlar **alohida bo'limga** ajratilgan; **mahalliy LLM** (Ollama) | ✅ `app/ai/` + fallback |
| 2 | **Barcha fan o'qituvchilari** uchun moslashgan | ✅ fan — birinchi darajali entity |
| 3 | To'liq baholash + **feedback** (o'qituvchi → o'quvchi → analitika) | ✅ feedback + analitika |
| 3 | Barcha fanlar **alohida**, bir xil imkoniyat + **demo seederlar** | ✅ 8 fan + seed |
| 4 | Vazifa/baholash/darsda **zamonaviy interaktiv usullar** | ✅ usullar katalogi |
| 5 | Admin: **o'qituvchi/muassasa qo'shish** va **API berish** | ✅ admin + API kalitlar |

## Sun'iy intellekt — alohida bo'lim (`app/ai/`)

Barcha AI-talab qiluvchi mantiq bitta modulda:

- `provider.py` — **Ollama** (mahalliy LLM) ga HTTP orqali ulanadi.
- `grader.py` — ochiq javoblarni (qisqa javob, insho) baholaydi va o'zbekcha izoh/tavsiya beradi.
- **Fallback:** Ollama o'rnatilmagan bo'lsa, qoidaga-asoslangan (rule-based) baholovchi ishlaydi —
  demo **model'siz ham to'liq ishlaydi**.

Ollama'ni ulash (ixtiyoriy, keyinroq):
```bash
# https://ollama.com
ollama pull llama3.1        # yoki mahalliy o'zbekcha model
# backend/.env -> AI_MODEL=llama3.1
```
Obyektiv savollar (variantli, bo'sh joy, to'g'ri/noto'g'ri) **AI'siz**, deterministik baholanadi.

## Arxitektura

```
baholAI/
├── backend/                FastAPI + SQLAlchemy + SQLite (async)
│   ├── app/
│   │   ├── ai/             🤖 AI bo'limi (Ollama + fallback)
│   │   ├── models/        institutions, subjects, users, assignments,
│   │   │                  submissions, grades, feedback, api_keys
│   │   ├── routers/       auth, subjects, assignments, submissions,
│   │   │                  feedback, analytics, ai, admin, meta, v1
│   │   └── services/      grading (obyektiv), methods, analytics
│   └── seed.py            demo seederlar (8 fan)
└── frontend/               React 19 + Vite + Tailwind 4
    └── src/pages/         student / teacher / admin
```

## Ishga tushirish

**Backend** (port 8002):
```bash
cd backend
python3 -m virtualenv .venv         # yoki: python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python seed.py            # demo ma'lumotlar
.venv/bin/uvicorn app.main:app --reload --port 8002
```

**Frontend** (port 5175):
```bash
cd frontend
npm install
npm run dev
```

Brauzer: **http://localhost:5175**

## Demo hisoblar

| Rol | Login | Parol |
|---|---|---|
| Superadmin | `admin` | `admin123` |
| Muassasa admini | `rector` | `rector123` |
| O'qituvchi (har fan) | `teacher_matematika` … | `teacher123` |
| O'quvchi | `student1` … `student6` | `student123` |

Login sahifasida bir bosishli demo tugmalari ham bor.

## Ommaviy API (`/api/v1`, API kalit bilan)

Admin panelidan kalit yaratiladi, so'ng:
```bash
curl http://localhost:8002/api/v1/subjects -H "X-API-Key: bk_..."
curl http://localhost:8002/api/v1/analytics/overview -H "X-API-Key: bk_..."
```

## Keyingi bosqich (to'liq versiya — rejada)

- O'zbek tilidagi nutq↔matn (STT/TTS) modullari (vazirlik yo'nalishi).
- Real interaktiv rejimlar (kviz-jang jonli reyting, o'zaro baholash oqimi).
- Chatbot / AI agent (o'quvchi va professor uchun).
- Guruhlar, davomat, jadval, to'lov; ko'p-tilli UI; mobil ilova.
- To'liq autentifikatsiya (JWT/parol hash), Alembic migratsiyalari, testlar.

## Litsenziya

MIT.
