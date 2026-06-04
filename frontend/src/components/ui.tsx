import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>{children}</div>;
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'ai' }) {
  const styles: Record<string, string> = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    ghost: 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700',
    danger: 'bg-red-50 border border-red-300 text-red-700 hover:bg-red-100',
    ai: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white',
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition ${styles[variant]} ${className}`}
    />
  );
}

const BADGE_COLORS: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  violet: 'bg-violet-100 text-violet-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
};

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: string }) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${BADGE_COLORS[color] ?? BADGE_COLORS.slate}`}>
      {children}
    </span>
  );
}

export function PercentBar({ percent, color = '#6366f1' }: { percent: number; color?: string }) {
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, percent)}%`, background: color }} />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </Card>
  );
}

export function AiBadge({ provider }: { provider: 'ollama' | 'fallback' }) {
  return provider === 'ollama' ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">🤖 Ollama LLM</span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⚙️ Qoidaviy (fallback)</span>
  );
}
