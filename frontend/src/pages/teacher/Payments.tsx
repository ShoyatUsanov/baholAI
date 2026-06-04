import { useEffect, useState } from 'react';
import { Wallet, Plus } from 'lucide-react';

import { Card, Button, Badge, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { Payment, User } from '@/lib/types';

const STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'paid', label: "To'langan", color: 'green' },
  { value: 'pending', label: 'Kutilmoqda', color: 'amber' },
  { value: 'overdue', label: 'Muddati oʻtgan', color: 'red' },
];

const statusMeta = (s: string) => STATUSES.find((x) => x.value === s) ?? { value: s, label: s, color: 'slate' };

export default function Payments() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    student_id: 0,
    amount: 0,
    period: new Date().toISOString().slice(0, 7),
    status: 'pending',
  });

  const load = () => api.get<Payment[]>('/ops/payments').then(setPayments);

  useEffect(() => {
    api.get<User[]>('/users?role=student').then(setStudents);
    load();
  }, []);

  const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));

  const create = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.post('/ops/payments', {
        student_id: form.student_id,
        amount: Number(form.amount) || 0,
        currency: 'UZS',
        period: form.period,
        status: form.status,
      });
      setForm({ student_id: 0, amount: 0, period: new Date().toISOString().slice(0, 7), status: 'pending' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (payments === null) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <PageHeader title="To'lovlar" description="O'quvchilar to'lovlarini boshqaring" />

      <Card className="p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Plus size={16} /> Yangi to'lov
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="input"
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: Number(e.target.value) })}
          >
            <option value={0}>— o'quvchi tanlang —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            type="number"
            className="input"
            placeholder="Summa (so'm)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
          />
          <input
            className="input"
            placeholder="Davr (masalan, 2026-06)"
            value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value })}
          />
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button onClick={create} disabled={busy || !form.student_id || !form.period}>
          {busy ? 'Saqlanmoqda…' : "To'lov qo'shish"}
        </Button>
      </Card>

      {payments.length === 0 ? (
        <Empty>Hali to'lov yo'q</Empty>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => {
            const meta = statusMeta(p.status);
            return (
              <Card key={p.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent-100 dark:bg-accent-900/40 grid place-items-center text-accent-600">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{studentMap[p.student_id]?.name ?? `#${p.student_id}`}</div>
                    <div className="text-xs text-slate-400">{p.period}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    {p.amount.toLocaleString()} {p.currency}
                  </span>
                  <Badge color={meta.color}>{meta.label}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
