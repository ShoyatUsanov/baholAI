import { useEffect, useState } from 'react';

import { Card, Spinner, Empty, Badge, Stat } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Payment } from '@/lib/types';

const STATUS_COLOR: Record<string, string> = {
  paid: 'accent',
  pending: 'amber',
  overdue: 'red',
};

const STATUS_LABEL: Record<string, string> = {
  paid: "To'langan",
  pending: 'Kutilmoqda',
  overdue: 'Muddati o\'tgan',
};

function fmt(amount: number, currency: string) {
  return `${amount.toLocaleString()} ${currency}`;
}

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<Payment[]>(`/ops/payments?student_id=${user.id}`).then(setPayments);
  }, [user]);

  if (!payments) return <Spinner />;

  const paid = payments.filter((p) => p.status === 'paid');
  const total = paid.reduce((s, p) => s + p.amount, 0);
  const currency = payments[0]?.currency ?? "so'm";

  return (
    <div>
      <PageHeader title="To'lovlar" description="To'lov tarixingiz va holati" />
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Stat label="Jami to'langan" value={fmt(total, currency)} />
        <Stat label="To'lovlar soni" value={payments.length} />
      </div>
      {payments.length === 0 ? (
        <Empty>To'lov ma'lumoti yo'q</Empty>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm">{p.period}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{fmt(p.amount, p.currency)}</div>
              </div>
              <Badge color={STATUS_COLOR[p.status] ?? 'slate'}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
