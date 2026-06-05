import type { ReactNode } from 'react';

const BADGE_COLORS: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
  indigo: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200',
  secondary: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-200',
  violet: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-200',
  accent: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200',
  green: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200',
  success: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
};

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: string }) {
  return <span className={`badge ${BADGE_COLORS[color] ?? BADGE_COLORS.slate}`}>{children}</span>;
}
