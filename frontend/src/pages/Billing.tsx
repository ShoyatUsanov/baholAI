import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Users, XCircle } from 'lucide-react';

import HelpBanner from '@/components/HelpBanner';
import { PageHeader } from '@/components/Layout';
import PlanBadge from '@/components/PlanBadge';
import PricingCards from '@/components/PricingCards';
import { useToast } from '@/components/Toast';
import { Button, Card, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/billing';
import { formatSom } from '@/lib/format';
import type { Plan } from '@/lib/types';

export default function Billing() {
  const { data, reload } = useSubscription();
  const { user } = useAuth();
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    api.get<Plan[]>('/billing/plans').then(setPlans);
  }, []);

  const subscribe = async (code: string, cycle: 'monthly' | 'yearly') => {
    setBusy(code);
    try {
      const res = await api.post<{ plan: Plan }>('/billing/subscribe', { plan_code: code, billing_cycle: cycle });
      await reload();
      toast.success(`${res.plan.name} tarifi faollashtirildi 🎉`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setCanceling(true);
    try {
      await api.post('/billing/me/subscription/cancel');
      await reload();
      toast.info('Obuna bekor qilindi — muddat oxirigacha amal qiladi.');
    } finally {
      setCanceling(false);
    }
  };

  if (!plans || !data) return <Spinner />;
  const sub = data.subscription;
  const isPaid = data.plan_code !== 'free' && sub;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Obuna" description="Tarifingizni boshqaring va imkoniyatlarni oching" />
      <HelpBanner id="billing">
        💡 To'lov <b>demo (mock)</b> rejimida — tugma bossangiz tarif darhol faollashadi, haqiqiy pul
        yechilmaydi. Istalgan vaqtda o'zgartiring yoki bekor qiling.
      </HelpBanner>

      <Card className="p-5 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Joriy tarif:</span>
            <PlanBadge code={data.plan_code} />
          </div>
          {sub?.days_left != null && (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarClock size={15} /> {sub.days_left} kun qoldi
              <span className="text-slate-400">· {sub.billing_cycle === 'yearly' ? 'yillik' : 'oylik'}</span>
            </span>
          )}
          {sub?.status === 'canceled' && (
            <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">Bekor qilingan</span>
          )}
          {isPaid && sub?.status === 'active' && (
            <Button variant="ghost" onClick={cancel} disabled={canceling} className="ml-auto text-red-600">
              <XCircle size={16} /> {canceling ? '…' : 'Bekor qilish'}
            </Button>
          )}
        </div>

        {user?.role === 'teacher' && data.student_count != null && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Users size={15} className="text-primary-500" />
              {data.student_count}{data.student_cap != null ? ` / ${data.student_cap}` : ''} o'quvchi
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600 dark:text-slate-300">
              Oylik to'lov: <b>{formatSom(data.current_monthly_cost ?? 0)}</b>
              {data.features?.per_member && <span className="text-slate-400"> ({data.student_count} × {formatSom(12000)})</span>}
            </span>
            <Link to="/teacher/students" className="text-primary-600 dark:text-primary-400 hover:underline ml-auto">
              O'quvchilarni boshqarish →
            </Link>
          </div>
        )}
      </Card>

      <h2 className="text-xl font-bold text-center mb-1">Tarifni tanlang</h2>
      <p className="text-center text-slate-500 mb-6">Istalgan vaqtda o'zgartiring yoki bekor qiling.</p>
      <PricingCards plans={plans} currentCode={data.plan_code} busyCode={busy} ctaLabel="Tanlash" onSelect={subscribe} />
    </div>
  );
}
