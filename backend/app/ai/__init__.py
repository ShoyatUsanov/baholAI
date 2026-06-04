"""AI (sun'iy intellekt) bo'limi — alohida modul.

Hamma sun'iy-intellekt talab qiladigan baholash/feedback shu yerda. Tashqi
qatlam (routerlar) faqat shu modulning yuqori-darajali funksiyalarini chaqiradi:
local LLM (Ollama) mavjud bo'lsa undan, bo'lmasa qoidaga-asoslangan fallback'dan
foydalanadi — ikkala holatda ham bir xil shakldagi natija qaytadi.
"""
from app.ai.grader import draft_feedback, grade_open_answer
from app.ai.provider import ai_status

__all__ = ["grade_open_answer", "draft_feedback", "ai_status"]
