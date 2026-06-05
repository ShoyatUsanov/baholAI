import { useState, type ReactNode } from 'react';
import { Lightbulb, X } from 'lucide-react';

export default function HelpBanner({ id, children }: { id: string; children: ReactNode }) {
  const key = `baholai_help_${id}`;
  const [hidden, setHidden] = useState(() => localStorage.getItem(key) === '1');
  if (hidden) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 mb-5">
      <Lightbulb size={18} className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-blue-900 dark:text-blue-200">{children}</div>
      <button
        onClick={() => { setHidden(true); localStorage.setItem(key, '1'); }}
        className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 shrink-0"
        aria-label="Yopish"
      >
        <X size={16} />
      </button>
    </div>
  );
}
