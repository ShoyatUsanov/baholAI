import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';

import { useSubscription } from '@/lib/billing';
import type { PlanFeatures } from '@/lib/types';

export default function FeatureLock({
  feature,
  title = 'Bu imkoniyat yuqori tarifda',
  children,
}: {
  feature: keyof PlanFeatures;
  title?: string;
  children: ReactNode;
}) {
  const { hasFeature, loading } = useSubscription();
  if (loading || hasFeature(feature)) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className="pointer-events-none select-none blur-sm opacity-50 max-h-72 overflow-hidden">{children}</div>
      <div className="absolute inset-0 grid place-items-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] p-6 text-center">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-brand-gradient grid place-items-center text-white mx-auto shadow-sm">
            <Lock size={22} />
          </div>
          <div className="mt-3 font-semibold">{title}</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Bu funksiyadan foydalanish uchun tarifingizni yangilang.
          </p>
          <Link to="/billing" className="btn btn-primary mt-4">
            <Sparkles size={16} /> Tarifni yangilash
          </Link>
        </div>
      </div>
    </div>
  );
}
