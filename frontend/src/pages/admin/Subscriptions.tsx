import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/Layout';
import PlanBadge from '@/components/PlanBadge';
import { Card, Empty, Spinner, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { formatSom } from '@/lib/format';
import type { Subscription } from '@/lib/types';

interface Resp {
  subscriptions: Subscription[];
  total_revenue: number;
  by_plan: Record<string, number>;
  paid_count: number;
}

const STATUS_CLS: Record<string, string> = {
  active: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
  canceled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  expired: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
};

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
}

export default function Subscriptions() {
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    api.get<Resp>('/admin/subscriptions').then(setData);
  }, []);
  if (!data) return <Spinner />;

  const active = Object.values(data.by_plan).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-5xl">
      <PageHeader title="Obunalar" description="Foydalanuvchilar tariflari va daromad" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Stat label="Jami daromad" value={formatSom(data.total_revenue)} />
        <Stat label="To'lovlar" value={data.paid_count} />
        <Stat label="Faol obunalar" value={active} />
        <Stat label="Premium / Medium" value={`${data.by_plan.premium ?? 0} / ${data.by_plan.medium ?? 0}`} />
      </div>

      <Card className="p-0 overflow-hidden">
        {data.subscriptions.length === 0 ? (
          <Empty>Obuna yo'q</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Foydalanuvchi</th>
                  <th className="px-4 py-3 font-medium">Tarif</th>
                  <th className="px-4 py-3 font-medium">Sikl</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 font-medium">Qoldi</th>
                  <th className="px-4 py-3 font-medium">Tugaydi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {data.subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.user_name}</div>
                      <div className="text-xs text-slate-400">@{s.username}</div>
                    </td>
                    <td className="px-4 py-3"><PlanBadge code={s.plan_code} /></td>
                    <td className="px-4 py-3 text-slate-500">{s.billing_cycle === 'yearly' ? 'Yillik' : 'Oylik'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_CLS[s.status] ?? STATUS_CLS.expired}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s.days_left != null ? `${s.days_left} kun` : '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(s.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
