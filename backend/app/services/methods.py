"""Catalog of modern / interactive teaching & assessment methods.

These are subject-agnostic and attachable to any assignment. The full version
will drive distinct UIs per method; in basic mode they tag the assignment and
surface a short description + recommended question types.
"""

INTERACTIVE_METHODS = [
    {
        "id": "standard",
        "name": "Standart",
        "icon": "📝",
        "description": "An'anaviy savol-javob topshirig'i.",
        "recommended": ["mcq", "fill", "short"],
    },
    {
        "id": "gamification",
        "name": "Geymifikatsiya",
        "icon": "🎮",
        "description": "Ball, daraja va mukofotlar bilan o'yin uslubidagi topshiriq.",
        "recommended": ["mcq", "truefalse", "match"],
    },
    {
        "id": "quiz_battle",
        "name": "Kviz-jang",
        "icon": "⚡",
        "description": "Vaqtga qarshi tezkor kviz; reyting jonli yangilanadi.",
        "recommended": ["mcq", "truefalse"],
    },
    {
        "id": "peer_review",
        "name": "O'zaro baholash",
        "icon": "🤝",
        "description": "Talabalar bir-birining ochiq javoblarini baholaydi (AI yordamida tekshiriladi).",
        "recommended": ["short", "essay"],
    },
    {
        "id": "flipped",
        "name": "Teskari sinf",
        "icon": "🔄",
        "description": "Uyda materialni o'rganib, sinfda amaliyot qiladi.",
        "recommended": ["short", "essay", "fill"],
    },
    {
        "id": "project",
        "name": "Loyiha asosida",
        "icon": "🏗️",
        "description": "Real muammoni hal qiluvchi loyiha topshirig'i.",
        "recommended": ["essay", "short"],
    },
    {
        "id": "debate",
        "name": "Munozara",
        "icon": "💬",
        "description": "Dalillar bilan fikr bildirish; AI argument sifatini baholaydi.",
        "recommended": ["essay"],
    },
]

_METHOD_IDS = {m["id"] for m in INTERACTIVE_METHODS}


def is_valid_method(method_id: str) -> bool:
    return method_id in _METHOD_IDS
