# baholAI — Online deploy (hackathon demosi uchun)

Loyiha **bitta Docker xizmati** sifatida ishlaydi: FastAPI backend ham API, ham
tayyor React frontend'ni **bitta manzildan** beradi. Demak jurilarga **bitta havola**
yetarli — `https://...` ochsa, to'liq sayt ishlaydi.

- ✅ Internetdan boshqa hech narsa kerak emas (AI **fallback** rejimida — Ollama shart emas)
- ✅ Birinchi ishga tushganda **demo ma'lumotlar avtomatik yuklanadi** (auto-seed)
- ✅ CORS muammosi yo'q (frontend va API bir manzilda)

## Demo akkauntlar
| Rol | Login | Parol |
|---|---|---|
| O'qituvchi | `teacher_matematika` | `teacher123` |
| O'quvchi | `student1` | `student123` |
| Admin | `admin` | `admin123` |

> Har bir fan uchun: `teacher_<fan>` (masalan `teacher_fizika`). O'quvchilar: `student1`…`student6`.

---

## A-variant — Render (eng oson, tavsiya etiladi)

1. [render.com](https://render.com) — GitHub bilan ro'yxatdan o'ting (bepul).
2. **New → Blueprint** → `ShoyatUsanov/baholAI` repo'sini tanlang.
3. Render `render.yaml`'ni o'qiydi → **Apply** bosing.
4. 5–10 daqiqada build tugaydi → havola: `https://baholai.onrender.com`

Yoki qo'lda: **New → Web Service** → repo → **Runtime: Docker** → **Create**.

## B-variant — Railway

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
2. `baholaI` repo → Railway `Dockerfile`'ni avtomatik aniqlaydi → **Deploy**.
3. **Settings → Networking → Generate Domain** → havola tayyor.

## C-variant — Lokal Docker (demo xonasi uchun ENG ISHONCHLI zaxira)

Internet beqaror bo'lsa, noutbukda konteynerni ishga tushiring — bitta manzil:

```bash
docker build -t baholai .
docker run -p 8002:8002 baholai
# Brauzerda oching: http://localhost:8002
```

---

## Muhim eslatmalar
- **Bepul tarif "uxlaydi":** Render/Railway bepul xizmati 15 daqiqa harakatsizlikdan
  keyin to'xtaydi. Birinchi ochilish ~30–60 soniya kutadi (keyin tez). Demo oldidan
  havolani bir marta ochib "uyg'oting".
- **Ma'lumotlar:** SQLite vaqtinchalik — qayta deploy/restart'da demo ma'lumotlar
  qaytadan yuklanadi (toza holat). Demo uchun ayni muddao.
- **Xavfsizlik:** hech qanday maxfiy kalit kerak emas; `.env`/DB GitHub'ga yuklanmaydi.

## Mahalliy ishga tushirish (dasturchilar uchun)
```bash
# Backend
cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python seed.py
.venv/bin/uvicorn app.main:app --port 8002
# Frontend (alohida terminal)
cd frontend && npm install && npm run dev   # http://localhost:5175
```
