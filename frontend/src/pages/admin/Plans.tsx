import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/Layout';
import { useToast } from '@/components/Toast';
import { Button, Card, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatSom } from '@/lib/format';
import type { Plan } from '@/lib/types';

export default function Plans() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const load = () => api.get<Plan[]>('/admin/plans').then(setPlans);
  useEffect(() => { load(); }, []);
  if (!plans) return <Spinner />;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Tariflar" description="Narx va imkoniyatlarni tahrirlash" />
      <div className="grid md:grid-cols-3 gap-4">
        {[...plans].sort((a, b) => a.order_idx - b.order_idx).map((p) => (
          <PlanEditor key={p.code} plan={p} onSaved={load} />
        ))}
      </div>
    </div>
  );
}

function PlanEditor({ plan, onSaved }: { plan: Plan; onSaved: () => void }) {
  const toast = useToast();
  const [monthly, setMonthly] = useState(plan.price_monthly);
  const [yearly, setYearly] = useState(plan.price_yearly);
  const [aiLimit, setAiLimit] = useState<string>(plan.features.ai_grading_limit == null ? '' : String(plan.features.ai_grading_limit));
  const [plagiarism, setPlagiarism] = useState(plan.features.plagiarism);
  const [xpMult, setXpMult] = useState(plan.features.xp_multiplier);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/plans/${plan.code}`, {
        price_monthly: monthly,
        price_yearly: yearly,
        features: {
          ai_grading_limit: aiLimit === '' ? null : Number(aiLimit),
          plagiarism,
          xp_rewards: plagiarism || plan.features.xp_rewards,
          xp_multiplier: Number(xpMult),
        },
      });
      toast.success(`${plan.name} saqlandi`);
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="font-bold mb-3">{plan.name} <span className="text-xs text-slate-400">({plan.code})</span></div>
      <div className="space-y-2.5 text-sm">
        <Field label="Oylik narx (so'm)"><input type="number" value={monthly} onChange={(e) => setMonthly(+e.target.value)} className="input" /></Field>
        <Field label="Yillik narx (so'm)"><input type="number" value={yearly} onChange={(e) => setYearly(+e.target.value)} className="input" /></Field>
        <Field label="AI limit (bo'sh=cheksiz)"><input type="number" value={aiLimit} onChange={(e) => setAiLimit(e.target.value)} placeholder="cheksiz" className="input" /></Field>
        <Field label="XP multiplier"><input type="number" value={xpMult} onChange={(e) => setXpMult(+e.target.value)} className="input" /></Field>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={plagiarism} onChange={(e) => setPlagiarism(e.target.checked)} className="rounded border-slate-300 text-primary-600" />
          Plagiat detektor
        </label>
      </div>
      <div className="text-xs text-slate-400 mt-2">
        Hozir: {formatSom(plan.price_monthly)}/oy · {formatSom(plan.price_yearly)}/yil
      </div>
      <Button onClick={save} disabled={busy} className="w-full mt-3">{busy ? '…' : 'Saqlash'}</Button>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
