import type { InputHTMLAttributes, ReactNode } from 'react';

export function Input({
  label,
  hint,
  icon,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; icon?: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">{label}</span>}
      <span className="relative block">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>
        )}
        <input {...props} className={`input ${icon ? 'pl-10' : ''} ${className}`} />
      </span>
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}
