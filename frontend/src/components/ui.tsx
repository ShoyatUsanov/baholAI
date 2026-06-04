import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'accent' | 'outline' | 'ghost' | 'ai' }) {
  return <button {...props} className={`btn btn-${variant} ${className}`} />;
}

const BADGE_COLORS: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
  accent: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  green: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200',
};

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: string }) {
  return <span className={`badge ${BADGE_COLORS[color] ?? BADGE_COLORS.slate}`}>{children}</span>;
}

export function PercentBar({ percent, color }: { percent: number; color?: string }) {
  return (
    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-primary-600"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%`, ...(color ? { background: color } : {}) }}
      />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export function AiBadge({ provider }: { provider: 'ollama' | 'fallback' }) {
  return provider === 'ollama' ? (
    <span className="badge bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">🤖 Ollama LLM</span>
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
