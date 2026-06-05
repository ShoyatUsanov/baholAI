"""Demo seeder — populates baholAI with multi-subject data so the platform is
immediately demonstrable: institutions, subjects, teachers, students,
assignments (mixed objective + AI questions, varied interactive methods),
submissions (auto + AI graded) and teacher feedback.

Run:  .venv/bin/python seed.py
Idempotent: drops and recreates all tables each run.
"""
from __future__ import annotations

import asyncio
import secrets

from app.db import Base, SessionLocal, engine
from app.models import (
    Activity,
    Announcement,
    ApiKey,
    Assignment,
    Attendance,
    Collection,
    Deck,
    Feedback,
    Flashcard,
    Grade,
    Group,
    Institution,
    Lesson,
    Message,
    Notification,
    Payment,
    ScheduleEntry,
    Session,
    Subject,
    Submission,
    Test,
    User,
)
from app.originality import build_report
from app.services.grading import grade_submission

# ---------------------------------------------------------------------------
# Subjects (fanlar) — English is just one of many; all equal in capability.
# ---------------------------------------------------------------------------
SUBJECTS = [
    {"name": "Ingliz tili", "slug": "ingliz-tili", "icon": "🇬🇧", "color": "#2563eb"},
    {"name": "Matematika", "slug": "matematika", "icon": "➗", "color": "#dc2626"},
    {"name": "Fizika", "slug": "fizika", "icon": "🔭", "color": "#7c3aed"},
    {"name": "Ona tili", "slug": "ona-tili", "icon": "📖", "color": "#059669"},
    {"name": "Tarix", "slug": "tarix", "icon": "🏛️", "color": "#b45309"},
    {"name": "Informatika", "slug": "informatika", "icon": "💻", "color": "#0891b2"},
    {"name": "Kimyo", "slug": "kimyo", "icon": "⚗️", "color": "#db2777"},
    {"name": "Biologiya", "slug": "biologiya", "icon": "🧬", "color": "#16a34a"},
]

TEACHERS = {
    "ingliz-tili": "Dilnoza Karimova",
    "matematika": "Akmal Tursunov",
    "fizika": "Bekzod Rahimov",
    "ona-tili": "Nigora Yusupova",
    "tarix": "Sardor Aliyev",
    "informatika": "Jasur Qodirov",
    "kimyo": "Malika Sobirova",
    "biologiya": "Otabek Nazarov",
}

STUDENTS = [
    ("Ali Valiyev", "student1", "Bachelor 1"),
    ("Madina Rustamova", "student2", "Bachelor 1"),
    ("Sherzod Ergashev", "student3", "Bachelor 2"),
    ("Kamola Toshpo'latova", "student4", "Bachelor 2"),
    ("Aziz Murodov", "student5", "Bachelor 3"),
    ("Sevara Islomova", "student6", "Bachelor 1"),
]

# Per-subject assignment with a mix of objective + AI questions + a method.
ASSIGNMENTS = {
    "ingliz-tili": {
        "title": "Present Perfect — amaliyot",
        "method": "gamification",
        "description": "Present Perfect zamonini mustahkamlash.",
        "questions": [
            {"id": "q1", "type": "mcq", "prompt": "She ___ already finished.",
             "options": ["has", "have", "is", "had"], "answer": "has", "max_score": 2},
            {"id": "q2", "type": "fill", "prompt": "I ___ never been to London.",
             "answer": "have", "max_score": 2},
            {"id": "q3", "type": "truefalse", "prompt": "'Yet' Present Perfect bilan ishlatiladi.",
             "answer": "true", "max_score": 1},
            {"id": "q4", "type": "short", "ai_graded": True, "max_score": 5,
             "prompt": "Write 2 sentences using Present Perfect about your week.",
             "answer": "I have studied a lot this week. I have not finished my project yet."},
        ],
    },
    "matematika": {
        "title": "Kvadrat tenglamalar",
        "method": "quiz_battle",
        "description": "Kvadrat tenglama ildizlari.",
        "questions": [
            {"id": "q1", "type": "mcq", "prompt": "x² − 5x + 6 = 0 ildizlari?",
             "options": ["2 va 3", "1 va 6", "−2 va −3", "0 va 5"], "answer": "2 va 3", "max_score": 3},
            {"id": "q2", "type": "fill", "prompt": "Diskriminant formulasi: D = b² − ___",
             "answer": "4ac", "max_score": 2},
            {"id": "q3", "type": "short", "ai_graded": True, "max_score": 5,
             "prompt": "Diskriminant nima uchun kerakligini tushuntiring.",
             "answer": "Diskriminant tenglama nechta haqiqiy ildizga ega ekanini aniqlaydi."},
        ],
        # Rubric for q3 (explainable AI grading). max_points sum = q3.max_score.
        "rubric": [
            {"criterion": "Diskriminant ta'rifi", "max_points": 2,
             "description": "diskriminant ildiz soni aniqlash"},
            {"criterion": "Ildizlar soniga bog'liqlik", "max_points": 2,
             "description": "musbat ikkita nol bitta manfiy haqiqiy ildiz yo'q"},
            {"criterion": "Aniqlik va misol", "max_points": 1,
             "description": "tushuntirish misol aniq"},
        ],
    },
    "fizika": {
        "title": "Nyuton qonunlari",
        "method": "flipped",
        "description": "Klassik mexanika asoslari.",
        "questions": [
            {"id": "q1", "type": "mcq", "prompt": "F = m·a — bu nechanchi qonun?",
             "options": ["1-qonun", "2-qonun", "3-qonun", "Hech qaysi"], "answer": "2-qonun", "max_score": 3},
            {"id": "q2", "type": "truefalse", "prompt": "Inersiya — Nyutonning 1-qonuni.",
             "answer": "true", "max_score": 2},
            {"id": "q3", "type": "essay", "ai_graded": True, "max_score": 5,
             "prompt": "Nyutonning 3-qonunini misol bilan tushuntiring.",
             "answer": "Har bir ta'sirga teng va qarama-qarshi aks ta'sir bor; masalan, raketa gaz chiqarib oldinga harakatlanadi."},
        ],
    },
    "ona-tili": {
        "title": "Gap bo'laklari",
        "method": "standard",
        "description": "Ega va kesim.",
        "questions": [
            {"id": "q1", "type": "mcq", "prompt": "Gapning bosh bo'laklari?",
             "options": ["Ega va kesim", "Aniqlovchi va to'ldiruvchi", "Hol va undalma", "Bog'lovchi"],
             "answer": "Ega va kesim", "max_score": 3},
            {"id": "q2", "type": "short", "ai_graded": True, "max_score": 5,
             "prompt": "Ega va kesimga bittadan misol yozing.",
             "answer": "Bola kitob o'qidi. 'Bola' — ega, 'o'qidi' — kesim."},
        ],
    },
    "tarix": {
        "title": "Amir Temur davri",
        "method": "project",
        "description": "Temuriylar davlati.",
        "questions": [
            {"id": "q1", "type": "mcq", "prompt": "Amir Temur poytaxti?",
             "options": ["Samarqand", "Buxoro", "Toshkent", "Xiva"], "answer": "Samarqand", "max_score": 3},
            {"id": "q2", "type": "essay", "ai_graded": True, "max_score": 6,
             "prompt": "Amir Temurning davlat boshqaruvidagi islohotlarini yozing.",
             "answer": "Markazlashgan boshqaruv, qonunlar to'plami (Tuzuklar), savdo va madaniyatni rivojlantirish."},
        ],
    },
    "informatika": {
        "title": "Algoritmlar asoslari",
        "method": "standard",
        "description": "Tartiblash va murakkablik.",
        "questions": [
            {"id": "q1", "type": "mcq", "prompt": "Binary search murakkabligi?",
             "options": ["O(log n)", "O(n)", "O(n²)", "O(1)"], "answer": "O(log n)", "max_score": 3},
            {"id": "q2", "type": "fill", "prompt": "Massivni teng ikkiga bo'lib qidirish — ___ search.",
             "answer": "binary", "max_score": 2},
            {"id": "q3", "type": "short", "ai_graded": True, "max_score": 5,
             "prompt": "Algoritm nima ekanini o'z so'zingiz bilan tushuntiring.",
             "answer": "Algoritm — masalani yechish uchun aniq, cheklangan qadamlar ketma-ketligi."},
        ],
    },
    "kimyo": {
        "title": "Davriy jadval",
        "method": "gamification",
        "description": "Elementlar va guruhlar.",
        "questions": [
            {"id": "q1", "type": "mcq", "prompt": "Suvning kimyoviy formulasi?",
             "options": ["H2O", "CO2", "O2", "NaCl"], "answer": "H2O", "max_score": 2},
            {"id": "q2", "type": "truefalse", "prompt": "Vodorod — eng yengil element.",
             "answer": "true", "max_score": 2},
            {"id": "q3", "type": "short", "ai_graded": True, "max_score": 5,
             "prompt": "Kimyoviy reaksiya nima? Misol keltiring.",
             "answer": "Moddalarning yangi moddaga aylanishi; masalan, yonish: C + O2 → CO2."},
        ],
    },
    "biologiya": {
        "title": "Hujayra tuzilishi",
        "method": "flipped",
        "description": "Hujayra organoidlari.",
        "questions": [
            {"id": "q1", "type": "mcq", "prompt": "Hujayraning energiya stansiyasi?",
             "options": ["Mitoxondriya", "Yadro", "Ribosoma", "Vakuol"], "answer": "Mitoxondriya", "max_score": 3},
            {"id": "q2", "type": "essay", "ai_graded": True, "max_score": 5,
             "prompt": "Yadroning vazifasini tushuntiring.",
             "answer": "Yadro irsiy axborotni (DNK) saqlaydi va hujayra faoliyatini boshqaradi."},
        ],
    },
}


# Per-subject collections (to'plamlar) — title + icon + lesson titles.
COLLECTIONS = {
    "ingliz-tili": [("Tenses (Zamonlar)", "⏳", ["Present Simple", "Present Perfect", "Past Tenses"]),
                    ("So'z boyligi", "🗂️", ["Kundalik so'zlar", "Akademik so'zlar"])],
    "matematika": [("Algebra asoslari", "➗", ["Tenglamalar", "Kvadrat tenglamalar"]),
                   ("Geometriya", "📐", ["Uchburchaklar", "Aylana"])],
    "fizika": [("Mexanika", "⚙️", ["Nyuton qonunlari", "Energiya"]),
               ("Elektr", "⚡", ["Tok va kuchlanish"])],
    "ona-tili": [("Sintaksis", "📝", ["Gap bo'laklari", "Qo'shma gaplar"]),
                 ("Imlo", "✍️", ["Yozuv qoidalari"])],
    "tarix": [("O'zbekiston tarixi", "🏺", ["Amir Temur davri", "Mustaqillik"]),
              ("Jahon tarixi", "🌍", ["Qadimgi dunyo"])],
    "informatika": [("Algoritmlar", "🔢", ["Algoritm asoslari", "Tartiblash"]),
                    ("Dasturlash", "💾", ["O'zgaruvchilar", "Sikllar"])],
    "kimyo": [("Umumiy kimyo", "⚗️", ["Davriy jadval", "Reaksiyalar"]),
              ("Organik kimyo", "🧪", ["Uglevodorodlar"])],
    "biologiya": [("Sitologiya", "🔬", ["Hujayra tuzilishi", "Hujayra bo'linishi"]),
                  ("Genetika", "🧬", ["Irsiyat asoslari"])],
}

# A few flashcards per subject (front / back).
DECK_CARDS = {
    "ingliz-tili": [("knowledge", "bilim"), ("achievement", "yutuq"), ("research", "tadqiqot"), ("improve", "yaxshilamoq")],
    "matematika": [("hosila", "funksiya o'zgarish tezligi"), ("integral", "yig'indi/yuzani topish"), ("diskriminant", "D = b²−4ac"), ("vektor", "yo'nalishli kattalik")],
    "fizika": [("tezlanish", "tezlikning o'zgarish tezligi"), ("kuch", "F = m·a"), ("energiya", "ish bajarish qobiliyati"), ("quvvat", "vaqt birligidagi ish")],
    "ona-tili": [("ega", "gapning bosh bo'lagi (kim/nima)"), ("kesim", "ish-harakatni bildiradi"), ("aniqlovchi", "belgini bildiradi"), ("to'ldiruvchi", "obyektni bildiradi")],
    "tarix": [("Amir Temur", "Temuriylar asoschisi"), ("1991", "Mustaqillik yili"), ("Registon", "Samarqanddagi maydon"), ("Buyuk ipak yo'li", "qadimgi savdo yo'li")],
    "informatika": [("algoritm", "aniq qadamlar ketma-ketligi"), ("massiv", "bir turdagi elementlar to'plami"), ("sikl", "takrorlanuvchi blok"), ("O(log n)", "binary search murakkabligi")],
    "kimyo": [("H2O", "suv"), ("CO2", "karbonat angidrid"), ("valentlik", "bog'lanish qobiliyati"), ("kation", "musbat ion")],
    "biologiya": [("hujayra", "tirik organizm birligi"), ("mitoxondriya", "energiya stansiyasi"), ("DNK", "irsiy axborot"), ("fotosintez", "yorug'likdan oziq hosil qilish")],
}

LESSON_BODY = (
    "{ct} mavzusiga kirish. Ushbu darsda {subj} fanidan asosiy tushunchalar, "
    "ta'riflar va misollar ko'rib chiqiladi. Darsni o'qib chiqing, so'ng quyidagi "
    "interaktiv mashqlarni bajaring va bilimingizni mustahkamlang."
)


def _answers_for(questions: list[dict], correctness: float) -> dict:
    """Build a student's answers; `correctness` in [0,1] controls how good they are."""
    ans: dict = {}
    for i, q in enumerate(questions):
        good = (i / max(1, len(questions))) < correctness
        if q.get("ai_graded") or q["type"] in ("short", "essay"):
            ans[q["id"]] = q["answer"] if good else "Bilmadim, lekin harakat qildim."
        elif q["type"] == "mcq":
            ans[q["id"]] = q["answer"] if good else next(o for o in q["options"] if o != q["answer"])
        elif q["type"] == "truefalse":
            ans[q["id"]] = q["answer"] if good else ("false" if q["answer"] == "true" else "true")
        elif q["type"] == "fill":
            ans[q["id"]] = q["answer"] if good else "xato"
        else:
            ans[q["id"]] = q.get("answer")
    return ans


# Deterministic answers for the Matematika assignment that drive the originality
# demo. student1 & student2 overlap heavily (group copy-paste → high similarity);
# student3 reads as machine-written (uniform sentences, repeated connectors and
# keywords → high ai_likelihood). It is a SIGNAL only — never an auto-penalty.
_MATH_ORIGINALITY = {
    "student1": {
        "q1": "2 va 3", "q2": "4ac",
        "q3": (
            "Diskriminant kvadrat tenglamada ildizlar sonini aniqlash uchun kerak. "
            "Agar u musbat bo'lsa ikkita ildiz bor, nolga teng bo'lsa bitta ildiz bor, "
            "manfiy bo'lsa haqiqiy ildiz yo'q. Shuning uchun diskriminant juda muhim."
        ),
    },
    "student2": {
        "q1": "2 va 3", "q2": "4ac",
        "q3": (
            "Diskriminant kvadrat tenglamada ildizlar sonini topish uchun kerak. "
            "Agar u musbat bo'lsa ikkita yechim bor, nolga teng bo'lsa bitta yechim bor, "
            "manfiy bo'lsa haqiqiy ildiz yo'q. Demak diskriminant juda zarur."
        ),
    },
    "student3": {
        "q1": "2 va 3", "q2": "4ac",
        "q3": (
            "Diskriminant matematikada juda muhim hisoblanadi. "
            "Shuningdek, diskriminant tenglama uchun juda muhim hisoblanadi. "
            "Bundan tashqari, diskriminant ildizlarni aniqlash uchun muhim hisoblanadi. "
            "Shuningdek, diskriminant tenglama yechimi uchun muhim hisoblanadi. "
            "Xulosa qilib, diskriminant doimo juda muhim hisoblanadi."
        ),
    },
}

# Confidence demo for the matematika assignment: student4 gives a thorough answer
# covering every rubric criterion (high confidence → not flagged); student5 gives
# a thin answer (low confidence → auto needs_review).
_MATH_CONFIDENCE = {
    "student4": {
        "q1": "2 va 3", "q2": "4ac",
        "q3": (
            "Diskriminant tenglamaning nechta haqiqiy ildizi borligini aniqlaydi. "
            "Agar diskriminant musbat bo'lsa ikkita ildiz, nolga teng bo'lsa bitta ildiz, "
            "manfiy bo'lsa haqiqiy ildiz yo'q. Misol uchun D ni hisoblab ildizlar sonini aniq bilamiz."
        ),
    },
    "student5": {"q1": "2 va 3", "q2": "xato", "q3": "Diskriminant kerak."},
}


async def run() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        # Institutions
        uni = Institution(name="Andijon Davlat Universiteti", kind="university", region="Andijon")
        school = Institution(name="1-son IDUM", kind="school", region="Andijon")
        db.add_all([uni, school])
        await db.flush()

        # Admins
        db.add(User(role="superadmin", name="Super Admin", username="admin", password="admin123"))
        db.add(User(role="institution_admin", name="Rektor", username="rector",
                    password="rector123", institution_id=uni.id))

        # Subjects
        subjects: dict[str, Subject] = {}
        for s in SUBJECTS:
            subj = Subject(**s)
            db.add(subj)
            subjects[s["slug"]] = subj
        await db.flush()

        # Teachers (one per subject)
        teachers: dict[str, User] = {}
        for slug, name in TEACHERS.items():
            t = User(role="teacher", name=name, username=f"teacher_{slug.replace('-', '_')}",
                     password="teacher123", institution_id=uni.id, subject_id=subjects[slug].id)
            db.add(t)
            teachers[slug] = t

        # Students
        students: list[User] = []
        for name, username, level in STUDENTS:
            st = User(role="student", name=name, username=username, password="student123",
                      institution_id=uni.id, level=level)
            db.add(st)
            students.append(st)
        await db.flush()

        # Assignments (one per subject)
        assignments: dict[str, Assignment] = {}
        for slug, a in ASSIGNMENTS.items():
            asg = Assignment(
                subject_id=subjects[slug].id, teacher_id=teachers[slug].id,
                institution_id=uni.id, title=a["title"], description=a["description"],
                method=a["method"], questions=a["questions"], rubric=a.get("rubric", []),
                target_student_ids=[],
            )
            db.add(asg)
            assignments[slug] = asg
        await db.flush()

        # Submissions + grades (vary quality across students) + some feedback
        import random
        rng = random.Random(2026)
        by_username = {s.username: s for s in students}
        all_subs: list[Submission] = []
        for slug, asg in assignments.items():
            if slug == "matematika":
                # Deterministic set powering two demos on one assignment:
                #  - originality: student1≈student2 (copy), student3 AI-like
                #  - confidence: student4 thorough (high), student5 thin (needs_review)
                demo = {**_MATH_ORIGINALITY, **_MATH_CONFIDENCE}
                pairs = [(by_username[u], dict(ans)) for u, ans in demo.items()]
            else:
                # 3-5 students attempt each assignment
                who = rng.sample(students, k=rng.randint(3, 5))
                pairs = [
                    (st, _answers_for(asg.questions, rng.choice([0.4, 0.6, 0.8, 1.0])))
                    for st in who
                ]
            for st, answers in pairs:
                sub = Submission(assignment_id=asg.id, student_id=st.id, answers=answers, status="graded")
                db.add(sub)
                await db.flush()
                all_subs.append(sub)
                result = await grade_submission(asg.questions, answers, asg.rubric or [])
                grade = Grade(
                    submission_id=sub.id,
                    objective_score=result["objective_score"], ai_score=result["ai_score"],
                    total_score=result["total_score"], max_score=result["max_score"],
                    breakdown=result["breakdown"], ai_provider=result["ai_provider"],
                    rubric_breakdown=result["rubric_breakdown"], confidence=result["confidence"],
                    needs_review=result["needs_review"],
                )
                # Demo: teacher corrected the AI score on student3's math answer, so
                # the AI-vs-human diff is visible (was_changed keeps original ai_score).
                if slug == "matematika" and st.username == "student3":
                    grade.was_changed = True
                    grade.needs_review = False
                    grade.total_score = round(grade.objective_score + max(0.0, grade.ai_score - 1.5), 1)
                # Demo: student5's draft awaits teacher approval (human-in-the-loop).
                if slug == "matematika" and st.username == "student5":
                    grade.status = "pending"
                db.add(grade)
                pct = round(result["total_score"] / result["max_score"] * 100) if result["max_score"] else 0
                st.xp += pct
                # Teacher leaves feedback on ~60% of submissions
                if rng.random() < 0.6:
                    comment = (
                        "Ajoyib ish, shu zaylda davom eting!" if pct >= 80
                        else "Yaxshi harakat, ochiq savollarga ko'proq e'tibor bering." if pct >= 50
                        else "Mavzuni qayta ko'rib chiqamiz, qo'shimcha mashq beraman."
                    )
                    db.add(Feedback(
                        submission_id=sub.id, teacher_id=teachers[slug].id, student_id=st.id,
                        subject_id=subjects[slug].id, rating=max(2, min(5, pct // 20 + 1)),
                        comment=comment, seen_by_student=rng.random() < 0.5,
                    ))

        # Originality reports for every submission — built after all submissions
        # exist so peer similarity is symmetric. A SIGNAL for teachers, not a penalty.
        await db.flush()
        for sub in all_subs:
            await build_report(sub.id, db)

        # ---- AI agreement history (Prompt 3 dashboard) ----
        # ~20 graded open answers on the matematika assignment with a deliberate
        # calibration: high-confidence grades mostly stand (was_changed=False),
        # low-confidence ones get corrected more often. ~75% overall agreement.
        # Tuple: (confidence, ai_score, final_ai). was_changed = ai_score != final_ai.
        math = assignments["matematika"]
        _AGREEMENT_HISTORY = [
            (98, 5.0, 5.0), (95, 4.5, 4.5), (93, 4.0, 4.0), (90, 4.5, 4.5),
            (88, 5.0, 5.0), (96, 4.0, 4.0), (91, 3.5, 3.5), (86, 4.0, 3.0),   # 85-100: 1/8 changed
            (83, 3.5, 3.5), (80, 4.0, 4.0), (78, 3.0, 3.0), (75, 3.5, 3.5),
            (72, 4.0, 4.0), (74, 3.0, 1.5),                                   # 70-85: 1/6 changed
            (68, 3.0, 3.0), (60, 2.5, 2.5), (55, 3.0, 1.0),                   # 50-70: 1/3 changed
            (48, 2.0, 2.0), (40, 2.5, 0.5), (30, 3.0, 1.0),                   # 0-50: 2/3 changed
        ]
        objective = 5.0  # q1 (3) + q2 (2), assumed correct for these history rows
        for i, (conf, ai_v, final_ai) in enumerate(_AGREEMENT_HISTORY):
            st = students[i % len(students)]
            hsub = Submission(
                assignment_id=math.id, student_id=st.id, status="graded",
                answers={"q1": "2 va 3", "q2": "4ac", "q3": "(baholash tarixi)"},
            )
            db.add(hsub)
            await db.flush()
            db.add(Grade(
                submission_id=hsub.id,
                objective_score=objective, ai_score=ai_v,
                total_score=round(objective + final_ai, 1), max_score=10.0,
                breakdown=[], ai_provider="fallback",
                rubric_breakdown=[{
                    "criterion": "Mazmun va to'g'rilik", "points_given": final_ai,
                    "max_points": 5, "evidence": "", "suggestion": "",
                }],
                confidence=conf, needs_review=conf < 70, was_changed=abs(ai_v - final_ai) > 0.01,
            ))

        # ---- Collections, lessons, decks, tests (per subject) ----
        for slug, cols in COLLECTIONS.items():
            subj = subjects[slug]
            teacher = teachers[slug]
            for ci, (ctitle, cicon, lesson_titles) in enumerate(cols):
                col = Collection(subject_id=subj.id, title=ctitle, icon=cicon, order_idx=ci, level="Boshlang'ich")
                db.add(col)
                await db.flush()
                for li, lt in enumerate(lesson_titles):
                    ex = [{
                        "id": "p1", "type": "mcq", "prompt": f"{lt}: to'g'ri javobni tanlang",
                        "options": ["To'g'ri variant", "Variant B", "Variant C"],
                        "answer": "To'g'ri variant", "max_score": 1,
                    }]
                    db.add(Lesson(collection_id=col.id, title=lt,
                                  content=LESSON_BODY.format(ct=lt, subj=subj.name),
                                  est_minutes=10 + li * 5, exercises=ex, order_idx=li))
                if ci == 0:  # one deck + one test on the first collection
                    deck = Deck(subject_id=subj.id, collection_id=col.id,
                                title=f"{subj.name} — kartochkalar", owner_id=teacher.id)
                    db.add(deck)
                    await db.flush()
                    for i, (front, back) in enumerate(DECK_CARDS[slug]):
                        db.add(Flashcard(deck_id=deck.id, front=front, back=back, order_idx=i))
                    db.add(Test(subject_id=subj.id, collection_id=col.id,
                                title=f"{ctitle} — nazorat testi", duration_minutes=10,
                                questions=ASSIGNMENTS[slug]["questions"], created_by=teacher.id))
        await db.flush()

        # ---- Groups + schedule + attendance + payments ----
        from datetime import date, timedelta
        groups = []
        for slug in ["ingliz-tili", "matematika", "fizika"]:
            subj = subjects[slug]
            teacher = teachers[slug]
            members = [s.id for s in rng.sample(students, k=4)]
            g = Group(name=f"{subj.name} A-guruh", teacher_id=teacher.id, subject_id=subj.id,
                      level="Bachelor 1", member_ids=members, days=[1, 3, 5],
                      start_time="14:00", end_time="15:30", room="201", monthly_fee=300000)
            db.add(g)
            groups.append((g, members, teacher, subj))
        await db.flush()
        today = date(2026, 6, 4)
        for g, members, teacher, subj in groups:
            for d in (1, 3):
                db.add(ScheduleEntry(group_id=g.id, teacher_id=teacher.id, subject_id=subj.id,
                                     title=f"{subj.name} darsi", day_of_week=d,
                                     start_time="14:00", end_time="15:30", room="201"))
            for d in range(5):
                day = (today - timedelta(days=d)).isoformat()
                for sid in members:
                    st = rng.choice(["present", "present", "present", "absent", "late"])
                    db.add(Attendance(student_id=sid, group_id=g.id, date=day, status=st, marked_by=teacher.id))
            for sid in members:
                db.add(Payment(student_id=sid, amount=g.monthly_fee, period="2026-06",
                               status=rng.choice(["paid", "paid", "pending", "overdue"]), group_id=g.id))

        # ---- Announcements, messages, notifications, activity ----
        db.add(Announcement(title="Yakuniy imtihonlar boshlanmoqda",
                            body="Iyun oyida yakuniy nazorat ishlari o'tkaziladi. Tayyorgarlikni boshlang.",
                            created_by=2, audience="all"))
        db.add(Announcement(title="Yangi AI baholash tizimi",
                            body="Endi ochiq javoblar sun'iy intellekt yordamida baholanadi va o'zbekcha izoh beriladi.",
                            created_by=1, audience="all"))
        s0 = students[0]
        t0 = teachers["matematika"]
        db.add(Message(from_id=t0.id, to_id=s0.id, body="Salom! Uy vazifangizni ko'rdim, ajoyib ish."))
        db.add(Message(from_id=s0.id, to_id=t0.id, body="Rahmat, ustoz!"))
        db.add(Notification(user_id=s0.id, title="Yangi feedback", body="Matematika fanidan feedback oldingiz.",
                            type="grade", link="/student/feedback"))
        db.add(Notification(user_id=s0.id, title="Yangi e'lon", body="Yakuniy imtihonlar boshlanmoqda",
                            type="announcement", link="/announcements"))
        for st in students[:3]:
            db.add(Activity(user_id=st.id, type="lesson", title="Dars yakunlandi", xp=10))

        # A demo API key for the public /api/v1 surface
        db.add(ApiKey(
            key="bk_demo_" + secrets.token_hex(8), label="Demo integratsiya kaliti",
            institution_id=uni.id, scopes=["read:subjects", "read:analytics"],
        ))

        await db.commit()

    print("✅ Seed tayyor.")
    print("   Superadmin:  admin / admin123")
    print("   Muassasa admin: rector / rector123")
    print("   O'qituvchi:  teacher_matematika / teacher123 (har fan uchun teacher_<slug>)")
    print("   O'quvchi:    student1 / student123  (student1..student6)")


if __name__ == "__main__":
    asyncio.run(run())
