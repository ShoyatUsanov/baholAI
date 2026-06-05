import { useState } from 'react';
import type { ReactNode } from 'react';

import { Badge } from './Badge';
import { InfoTooltip } from './InfoTooltip';
import { CLASSIFICATION, VERIFICATION_HINT } from '@/lib/labels';
import type { RubricCriterion } from '@/lib/types';

export function PercentBar({ percent, color }: { percent: number; color?: string }) {
  return (
    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${color ? '' : 'bg-brand-gradient'}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%`, ...(color ? { background: color } : {}) }}
      />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-2xl font-bold mt-1 tracking-tight">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export function AiBadge({ provider }: { provider: 'ollama' | 'fallback' }) {
  return provider === 'ollama' ? (
    <span className="badge bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-200">🤖 Ollama LLM</span>
  ) : (
    <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">⚙️ Qoidaviy</span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-sm text-slate-400 py-6 text-center">{children}</div>;
}

export function Spinner() {
  return <div className="text-slate-400 dark:text-slate-500 p-8 text-center">Yuklanmoqda…</div>;
}

// Confidence in the AI grade. High → green, low (needs review) → amber.
export function ConfidenceBadge({ value }: { value: number }) {
  const high = value >= 70;
  return (
    <span
      className={`badge ${
        high
          ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
      }`}
      title={high ? 'AI bahosiga ishonch yuqori' : 'Ishonch past — ko\'rib chiqish tavsiya etiladi'}
    >
      {high ? '✓' : '⚠️'} Ishonch {value}%
    </span>
  );
}

function rubricColor(pct: number): string {
  if (pct >= 75) return '#10b981';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

// Explainable per-criterion breakdown: each row shows points + a "Nega bu ball?"
// toggle revealing the exact evidence and a suggestion.
export function RubricBreakdown({ items }: { items: RubricCriterion[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((c, i) => (
        <RubricRow key={i} c={c} />
      ))}
    </div>
  );
}

function RubricRow({ c }: { c: RubricCriterion }) {
  const [open, setOpen] = useState(true);
  const pct = c.max_points ? Math.round((c.points_given / c.max_points) * 100) : 0;
  const cls = c.classification ? CLASSIFICATION[c.classification] : null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <div className="flex items-center gap-2">
        {cls && <Badge color={cls.color}>{cls.label}</Badge>}
        <span className="text-question flex-1 min-w-0 line-clamp-2">{c.criterion}</span>
        <span className="text-base font-semibold">{c.points_given}/{c.max_points}</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <div className="flex-1">
          <PercentBar percent={pct} color={rubricColor(pct)} />
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline whitespace-nowrap"
        >
          {open ? 'Yashirish' : 'Nega bu ball?'}
        </button>
      </div>
      {open && (
        <div className="mt-2 text-sm space-y-1.5">
          {c.evidence ? (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border-l-2 border-primary-400 px-2.5 py-1.5 text-slate-700 dark:text-slate-200">
              <span className="text-slate-400">Javobingizdan:</span> «{c.evidence}»
            </div>
          ) : (
            <div className="text-slate-400">📌 {c.evidence_note || 'Mos dalil topilmadi.'}</div>
          )}
          {c.suggestion && (
            <div className="text-secondary-700 dark:text-secondary-300">💡 {c.suggestion}</div>
          )}
        </div>
      )}
    </div>
  );
}

// "3 bosqichli tekshiruv" rozetkasi — dalil qamrovini rubric_breakdown'dan hisoblaydi.
export function VerificationBadge({ items }: { items: RubricCriterion[] }) {
  const checked = items.filter((c) => c.classification);
  if (checked.length === 0) return null;
  const coverage = Math.round((checked.filter((c) => c.evidence).length / checked.length) * 100);
  const low = coverage < 50;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
          low
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            : 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300'
        }`}
      >
        ✓ 3 bosqichli tekshiruv · dalil {coverage}%
      </span>
      <InfoTooltip text={VERIFICATION_HINT} />
    </span>
  );
}
