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
    ApiKey,
    Assignment,
    Feedback,
    Grade,
    Institution,
    Session,
    Subject,
    Submission,
    User,
)
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
                method=a["method"], questions=a["questions"], target_student_ids=[],
            )
            db.add(asg)
            assignments[slug] = asg
        await db.flush()

        # Submissions + grades (vary quality across students) + some feedback
        import random
        rng = random.Random(2026)
        for slug, asg in assignments.items():
            # 3-5 students attempt each assignment
            who = rng.sample(students, k=rng.randint(3, 5))
            for st in who:
                correctness = rng.choice([0.4, 0.6, 0.8, 1.0])
                answers = _answers_for(asg.questions, correctness)
                sub = Submission(assignment_id=asg.id, student_id=st.id, answers=answers, status="graded")
                db.add(sub)
                await db.flush()
                result = await grade_submission(asg.questions, answers)
                db.add(Grade(
                    submission_id=sub.id,
                    objective_score=result["objective_score"], ai_score=result["ai_score"],
                    total_score=result["total_score"], max_score=result["max_score"],
                    breakdown=result["breakdown"], ai_provider=result["ai_provider"],
                ))
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
