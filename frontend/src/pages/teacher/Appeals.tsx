import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/Layout';
import { Badge, Button, Card, Empty, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Appeal } from '@/lib/types';

export default function Appeals() {
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);

  const load = useCallback(() => {
    api.get<Appeal[]>('/appeals').then(setAppeals);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!appeals) return <Spinner />;
  const open = appeals.filter((a) => a.status === 'open').length;

  return (
    <div className="max-w-3xl">
      <PageHeader title="E'tirozlar" description="O'quvchilarning bahoga e'tirozlarini ko'rib chiqing va javob bering" />
      {appeals.length === 0 ? (
        <Empty>Hozircha e'tiroz yo'q.</Empty>
      ) : (
        <>
          <div className="text-sm text-slate-500 mb-3">{open} ta ochiq · {appeals.length} ta jami</div>
          <div className="space-y-3">
            {appeals.map((a) => (
              <AppealCard key={a.id} a={a} onResolved={load} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AppealCard({ a, onResolved }: { a: Appeal; onResolved: () => void }) {
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);

  const resolve = async () => {
    if (!response.trim()) return;
    setBusy(true);
    try {
      await api.post(`/appeals/${a.id}/resolve`, { teacher_response: response });
      onResolved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-primary-600 text-white grid place-items-center text-xs font-bold uppercase shrink-0">
          {(a.student_name ?? '?')[0]}
        </div>
        <div className="font-medium flex-1">{a.student_name ?? `O'quvchi #${a.student_id}`}</div>
        <Badge color={a.status === 'open' ? 'amber' : 'green'}>
          {a.status === 'open' ? "⏳ Ochiq" : '✅ Hal qilingan'}
        </Badge>
        <Link to={`/student/result/${a.submission_id}`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
          Topshiriq
        </Link>
      </div>

      <div className="text-sm bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 mb-2">
        <span className="text-slate-500">Sabab:</span> {a.reason}
      </div>

      {a.status === 'resolved' ? (
        <div className="text-sm bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg p-3">
          <span className="font-medium">Javobingiz:</span> {a.teacher_response}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={2}
            placeholder="O'quvchiga javobingiz…"
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
          />
          <Button onClick={resolve} disabled={busy || !response.trim()}>
            {busy ? 'Yuborilmoqda…' : 'Javob berib yopish'}
          </Button>
        </div>
      )}
    </Card>
  );
}
