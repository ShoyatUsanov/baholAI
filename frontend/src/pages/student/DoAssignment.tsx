import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import type { Assignment, Submission } from '@/lib/types';

export default function DoAssignment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [a, setA] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Assignment>(`/assignments/${id}`).then(setA);
  }, [id]);

  if (!a) return <div className="text-slate-400">Yuklanmoqda…</div>;

  const set = (qid: string, v: string) => setAnswers((p) => ({ ...p, [qid]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      const sub = await api.post<Submission>('/submissions', { assignment_id: a.id, answers });
      navigate(`/student/result/${sub.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">{a.title}</h1>
      <p className="text-slate-500 mb-5">{a.description}</p>

      <div className="space-y-4">
        {a.questions.map((q, i) => {
          const isAi = q.ai_graded || q.type === 'short' || q.type === 'essay';
          return (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium">
                  {i + 1}. {q.prompt}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Badge>{q.max_score} ball</Badge>
                  {isAi ? <Badge color="violet">🤖 AI</Badge> : <Badge color="green">avto</Badge>}
                </div>
              </div>

              {q.type === 'mcq' && (
                <div className="space-y-1.5">
                  {q.options?.map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => set(q.id, o)} />
                      {o}
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'truefalse' && (
                <div className="flex gap-2">
                  {['true', 'false'].map((v) => (
                    <button
                      key={v}
                      onClick={() => set(q.id, v)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${
                        answers[q.id] === v ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300'
                      }`}
                    >
                      {v === 'true' ? "To'g'ri" : "Noto'g'ri"}
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'fill' && (
                <input
                  value={answers[q.id] ?? ''}
                  onChange={(e) => set(q.id, e.target.value)}
                  placeholder="Javob…"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              )}
              {(q.type === 'short' || q.type === 'essay') && (
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => set(q.id, e.target.value)}
                  rows={q.type === 'essay' ? 5 : 3}
                  placeholder="Javobingizni yozing…"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              )}
            </Card>
          );
        })}
      </div>

      <Button onClick={submit} disabled={busy} className="mt-5">
        {busy ? 'Baholanmoqda…' : 'Topshirish va baholash'}
      </Button>
    </div>
  );
}
