// Markazlashgan o'zbekcha lug'at — barcha texnik kod → sodda matn shu yerda.
// Texnik so'z (pending/auto/ai...) UI'da hech qachon ko'rinmasin.

export const GRADE_STATUS: Record<string, { label: string; hint: string }> = {
  pending: {
    label: 'Tasdiq kutilmoqda',
    hint: "AI baho qo'ydi. O'qituvchi tasdiqlagach o'quvchiga ko'rinadi.",
  },
  approved: {
    label: 'Tasdiqlangan',
    hint: "O'qituvchi bahoni tasdiqladi — o'quvchi ko'ra oladi.",
  },
};

export const GRADED_BY: Record<string, { label: string; hint: string }> = {
  auto: {
    label: 'Avtomatik',
    hint: "Variant yoki to'g'ri/noto'g'ri savol — tizim aniq baholadi.",
  },
  ai: {
    label: 'AI baholadi',
    hint: "Ochiq javobni AI baholadi. Yakuniy qaror o'qituvchida.",
  },
};

export const SUB_STATUS: Record<string, string> = {
  graded: 'Baholandi',
  submitted: 'Topshirildi',
};

export const SUBSCRIPTION_STATUS: Record<string, string> = {
  active: 'Faol',
  canceled: 'Bekor qilingan',
  expired: 'Muddati tugagan',
};

// Qisqa izohlar (InfoTooltip uchun)
export const HINTS = {
  confidence: "AI o'z bahosiga qanchalik ishonchli ekani.",
  needs_review: "AI past ishonch bilan baholadi — o'qituvchi ko'rib chiqishi tavsiya etiladi.",
  flagged: "Javobda nusxa yoki AI-yozilgan matn belgilari bor. Bu faqat signal — qaror o'qituvchida.",
  originality: "Nusxa (plagiat) va AI-yozilgan matn ehtimoli. O'qituvchi uchun signal, jazo emas.",
  similarity: "Boshqa o'quvchi javobiga qanchalik o'xshashligi.",
  ai_likelihood: "Matn AI tomonidan yozilgan bo'lishi ehtimoli.",
  xp: "Tajriba ballari — vazifalarni bajarib to'playsiz.",
  rubric: "Har bir mezon uchun alohida ball, dalil va tavsiya.",
  appeal: "Bahoga rozi bo'lmasangiz, o'qituvchiga e'tiroz bildirishingiz mumkin.",
  objective_score: "Variantli savollardan to'plangan ball.",
  ai_score: "Ochiq javoblar uchun AI qo'ygan ball.",
  plan_premium: "Premium: cheksiz AI, plagiat, kengaytirilgan analitika, 2x XP.",
} as const;
