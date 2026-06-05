import { useState } from 'react';
import { Check, Loader2, Minus, Sparkles } from 'lucide-react';

import { formatSom } from '@/lib/format';
import type { Plan, PlanFeatures } from '@/lib/types';

type Cycle = 'monthly' | 'yearly';

function featureRows(f: PlanFeatures): { label: string; value: boolean | string }[] {
  return [
    {
      label: "O'quvchilar",
      value: f.per_member ? `Har biri ${formatSom(12000)}/oy` : f.max_students == null ? 'Cheksiz' : `${f.max_students} tagacha`,
    },
    { label: 'Guruhlar', value: f.max_groups == null ? 'Cheksiz' : `${f.max_groups} ta` },
    { label: 'AI baholash', value: f.ai_grading_limit == null ? 'Cheksiz' : `Oyiga ${f.ai_grading_limit} ta` },
    { label: 'Plagiat & AI-detektor', value: f.plagiarism },
    { label: 'Tushuntiriladigan baholar', value: f.explainability === 'full' ? "To'liq" : 'Asosiy' },
    { label: 'Analitika', value: f.analytics === 'advanced' ? 'Kengaytirilgan' : f.analytics === 'basic' ? 'Asosiy' : false },
    { label: 'Flashcards & testlar', value: f.flashcards === 'full' ? "To'liq" : 'Cheklangan' },
    { label: 'XP reward', value: f.xp_rewards ? (f.xp_multiplier > 1 ? `${f.xp_multiplier}x` : true) : false },
    { label: 'Ustuvor apellyatsiya', value: f.priority_appeal },
    { label: 'Qo\'llab-quvvatlash', value: f.support === 'priority' ? 'Ustuvor' : f.support === 'email' ? 'Email' : 'Community' },
  ];
}

export default function PricingCards({
  plans,
  currentCode,
  busyCode,
  ctaLabel = 'Tanlash',
  onSelect,
}: {
  plans: Plan[];
  currentCode?: string;
  busyCode?: string | null;
  ctaLabel?: string;
  onSelect: (code: string, cycle: Cycle) => void;
}) {
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const sorted = [...plans].sort((a, b) => a.order_idx - b.order_idx);

  return (
    <div>
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          {(['monthly', 'yearly'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                cycle === c ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              {c === 'monthly' ? 'Oylik' : 'Yillik'}
              {c === 'yearly' && (
                <span className="ml-1.5 text-[10px] font-bold text-accent-600 dark:text-accent-400">-20%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {sorted.map((p) => {
          const popular = p.code === 'medium';
          const perMember = p.features.per_member;
          const price = cycle === 'yearly' ? p.price_yearly : p.price_monthly;
          const isCurrent = currentCode === p.code;
          return (
            <div
              key={p.code}
              className={`relative rounded-2xl border bg-[var(--surface)] p-6 transition-all ${
                popular
                  ? 'border-transparent ring-2 ring-primary-500 shadow-xl md:-translate-y-2'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-brand-gradient text-white shadow">
                  <Sparkles size={11} /> Ommabop
                </span>
              )}
              <div className="font-bold text-lg">{p.name}</div>
              <div className="mt-2 flex items-end gap-1">
                {perMember ? (
                  <>
                    <span className="text-3xl font-extrabold">{formatSom(p.price_monthly)}</span>
                    <span className="text-sm text-slate-400 mb-1">/o'quvchi/oy</span>
                  </>
                ) : price === 0 ? (
                  <span className="text-3xl font-extrabold">Bepul</span>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold">{formatSom(price)}</span>
                    <span className="text-sm text-slate-400 mb-1">/{cycle === 'yearly' ? 'yil' : 'oy'}</span>
                  </>
                )}
              </div>
              {perMember ? (
                <div className="text-xs text-slate-400 mt-0.5">Faqat ishlatganingiz uchun</div>
              ) : cycle === 'yearly' && p.price_monthly > 0 ? (
                <div className="text-xs text-slate-400 mt-0.5">~{formatSom(Math.round(p.price_yearly / 12))}/oy</div>
              ) : null}

              <ul className="mt-5 space-y-2.5">
                {featureRows(p.features).map((r) => (
                  <li key={r.label} className="flex items-start gap-2 text-sm">
                    {r.value === false ? (
                      <Minus size={16} className="text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                    ) : (
                      <Check size={16} className="text-accent-500 shrink-0 mt-0.5" />
                    )}
                    <span className={r.value === false ? 'text-slate-400 line-through' : ''}>
                      {r.label}
                      {typeof r.value === 'string' && <span className="text-slate-400"> · {r.value}</span>}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onSelect(p.code, cycle)}
                disabled={isCurrent || busyCode === p.code}
                className={`btn w-full mt-6 ${popular ? 'btn-primary' : 'btn-outline'} ${isCurrent ? 'opacity-60' : ''}`}
              >
                {busyCode === p.code ? <Loader2 size={16} className="animate-spin" /> : isCurrent ? 'Joriy tarif' : ctaLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
