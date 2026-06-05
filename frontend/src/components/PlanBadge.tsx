import { Sparkles } from 'lucide-react';

export default function PlanBadge({ code, className = '' }: { code: string; className?: string }) {
  if (code === 'premium') {
    return (
      <span className={`badge bg-brand-gradient text-white ${className}`}>
        <Sparkles size={11} /> Premium
      </span>
    );
  }
  if (code === 'medium') {
    return <span className={`badge bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200 ${className}`}>Medium</span>;
  }
  return <span className={`badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 ${className}`}>Free</span>;
}
