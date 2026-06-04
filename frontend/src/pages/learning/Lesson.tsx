import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Button, Card, Spinner, Badge } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { Lesson as L } from '@/lib/types';

export default function Lesson() {
  const { id } = useParams();
  const [l, setL] = useState<L | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { api.get<L>(`/learning/lessons/${id}`).then(setL); }, [id]);
  if (!l) return <Spinner />;

  const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
  const complete = async () => {
    await api.post(`/learning/lessons/${l.id}/complete`);
    setDone(true);
  };

  return (
    <div className="max-w-3xl">
      <Link to={`/collections/${l.collection_id}`} className="text-sm text-slate-500 hover:text-primary-600">← To'plam</Link>
      <PageHeader title={l.title} />

      <Card className="mb-6">
        <p className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">{l.content}</p>
      </Card>

      {l.exercises.length > 0 && (
        <>
          <h2 className="font-semibold mb-3">Mashqlar</h2>
          <div className="space-y-3 mb-6">
            {l.exercises.map((q, i) => {
              const ok = checked && norm(answers[q.id]) === norm(q.answer);
              return (
                <Card key={q.id}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-medium">{i + 1}. {q.prompt}</div>
                    {checked && (ok ? <CheckCircle2 className="text-accent-600" size={20} /> : <XCircle className="text-red-500" size={20} />)}
                  </div>
                  {q.type === 'mcq' ? (
                    <div className="space-y-1.5">
                      {q.options?.map((o) => (
                        <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name={q.id} disabled={checked} checked={answers[q.id] === o}
                            onChange={() => setAnswers((p) => ({ ...p, [q.id]: o }))} />
                          {o}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input className="input" disabled={checked} value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="Javob…" />
                  )}
                  {checked && !ok && <div className="text-sm text-accent-700 mt-1">To'g'ri javob: {String(q.answer)}</div>}
                </Card>
              );
            })}
          </div>
          {!checked && <Button onClick={() => setChecked(true)}>Tekshirish</Button>}
        </>
      )}

      <div className="mt-6">
        {done ? (
          <Badge color="accent">✓ Dars yakunlandi (+10 XP)</Badge>
        ) : (
          <Button variant="accent" onClick={complete}>Darsni yakunlash</Button>
        )}
      </div>
    </div>
  );
}
