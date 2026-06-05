import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export function InfoTooltip({ text, className = '' }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="text-slate-400 hover:text-primary-500 transition-colors"
        aria-label="Yordam"
      >
        <HelpCircle size={14} />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-20 sm:hidden" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <span className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 max-w-[60vw] rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs leading-snug px-3 py-2 shadow-lg text-left font-normal normal-case">
            {text}
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
          </span>
        </>
      )}
    </span>
  );
}
