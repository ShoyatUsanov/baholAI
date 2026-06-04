import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AiBadge, Badge, Button, Card, PercentBar, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { GradeBreakdown, Test } from '@/lib/types';

interface Result {
  percent: number;
  score: number;
  total: number;
  breakdown: GradeBreakdown[];
  ai_provider: 'ollama' | 'fallback';
}

export default function TestRunner() {
  const { id } = useParams();
  const [test, setTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get<Test>(`/learning/tests/${id}`).then(setTest); }, [id]);
  if (!test) return <Spinner />;

  const submit = async () => {
    setBusy(true);
    try {
      setResult(await api.post<Result>(`/learning/tests/${test.id}/submit`, { answers, time_spent: 0 }));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Test natijasi" />
        <Card className="mb-5">
          <div className="flex items-end justify-between mb-2">
            <div className="text-4xl font-bold">{result.percent}%</div>
            <div className="text-sm text-slate-500">{result.score} / {result.total} ball <AiBadge provider={result.ai_provider} /></div>
          </div>
          <PercentBar percent={result.percent} />
        </Card>
        <div className="space-y-3">
          {result.breakdown.map((b) => (
            <Card key={b.question_id}>
              <div className="flex items-center justify-between mb-1">
                <Badge color={b.graded_by === 'ai' ? 'violet' : b.score >= b.max ? 'accent' : 'red'}>
                  {b.graded_by === 'ai' ? '🤖 AI' : b.score >= b.max ? "to'g'ri" : "xato"}
                </Badge>
                <span className="text-sm font-semibold">{b.score}/{b.max}</span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">Javob: <i>{String(b.response ?? '—')}</i></div>
              {b.graded_by === 'auto' && b.correct === false && <div className="text-sm text-accent-700 mt-1">To'g'ri: {String(b.expected)}</div>}
              {b.graded_by === 'ai' && b.rationale && <div className="text-sm text-violet-700 dark:text-violet-300 mt-1">{b.rationale}</div>}
            </Card>
          ))}
        </div>
        <Link to="/tests" className="btn btn-outline mt-5 inline-flex">← Testlar</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link to="/tests" className="text-sm text-slate-500 hover:text-primary-600">← Testlar</Link>
      <PageHeader title={test.title} description={`${test.questions.length} savol · ${test.duration_minutes} daqiqa`} />
      <div className="space-y-4">
        {test.questions.map((q, i) => {
          const isAi = q.ai_graded || q.type === 'short' || q.type === 'essay';
          return (
            <Card key={q.id}>
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium">{i + 1}. {q.prompt}</div>
                <div className="flex gap-1 shrink-0">
                  <Badge>{q.max_score} ball</Badge>
                  {isAi && <Badge color="violet">🤖 AI</Badge>}
                </div>
              </div>
              {q.type === 'mcq' && q.options?.map((o) => (
                <label key={o} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                  <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => setAnswers((p) => ({ ...p, [q.id]: o }))} />{o}
                </label>
              ))}
              {q.type === 'truefalse' && (
                <div className="flex gap-2">
                  {['true', 'false'].map((v) => (
                    <button key={v} onClick={() => setAnswers((p) => ({ ...p, [q.id]: v }))}
                      className={`btn ${answers[q.id] === v ? 'btn-primary' : 'btn-outline'}`}>{v === 'true' ? "To'g'ri" : "Noto'g'ri"}</button>
                  ))}
                </div>
              )}
              {q.type === 'fill' && (
                <input className="input" value={answers[q.id] ?? ''} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="Javob…" />
              )}
              {(q.type === 'short' || q.type === 'essay') && (
                <textarea className="input" rows={q.type === 'essay' ? 5 : 3} value={answers[q.id] ?? ''} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="Javobingiz…" />
              )}
            </Card>
          );
        })}
      </div>
      <Button onClick={submit} disabled={busy} className="mt-5">{busy ? 'Baholanmoqda…' : 'Testni yakunlash'}</Button>
    </div>
  );
}
