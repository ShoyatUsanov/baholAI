import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type Kind = 'success' | 'error' | 'info' | 'warning';
interface ToastItem { id: number; kind: Kind; message: string }

interface ToastApi {
  show: (kind: Kind, message: string) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
  warning: (m: string) => void;
}

const ToastCtx = createContext<ToastApi>({
  show: () => {}, success: () => {}, error: () => {}, info: () => {}, warning: () => {},
});

const STYLE: Record<Kind, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-accent-600 dark:text-accent-400' },
  error: { icon: XCircle, cls: 'text-red-600 dark:text-red-400' },
  info: { icon: Info, cls: 'text-blue-600 dark:text-blue-400' },
  warning: { icon: AlertTriangle, cls: 'text-amber-600 dark:text-amber-400' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const show = useCallback((kind: Kind, message: string) => {
    const id = (idRef.current += 1);
    setItems((l) => [...l, { id, kind, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m),
    warning: (m) => show('warning', m),
  }), [show]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const { icon: Icon, cls } = STYLE[item.kind];
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-[var(--surface)] shadow-lg px-4 py-3 transition-all duration-300 ${
        shown ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
      }`}
    >
      <Icon size={20} className={`shrink-0 mt-0.5 ${cls}`} />
      <div className="flex-1 text-sm text-slate-700 dark:text-slate-200">{item.message}</div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}

export const useToast = () => useContext(ToastCtx);
