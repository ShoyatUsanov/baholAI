import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AiBadge, Badge, Card, PercentBar } from '@/components/ui';
import { api } from '@/lib/api';
import type { Feedback, Submission } from '@/lib/types';

export default function Result() {
  const { submissionId } = useParams();
  const [sub, setSub] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    api.get<Submission>(`/submissions/${submissionId}`).then(setSub);
    api.get<Feedback[]>(`/feedback?submission_id=${submissionId}`).then(setFeedback);
  }, [submissionId]);

  if (!sub || !sub.grade) return <div className="text-slate-400">Yuklanmoqda…</div>;
  const g = sub.grade;

  return (
    <div className="max-w-2xl">
      <Link to="/student/assignments" className="text-sm text-slate-500 hover:text-indigo-600">← Vazifalar</Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">Natija</h1>

      <Card className="p-5 mb-5">
        <div className="flex items-end justify-between mb-2">
          <div className="text-4xl font-bold">{g.percent}%</div>
          <div className="text-sm text-slate-500">{g.total_score} / {g.max_score} ball</div>
        </div>
        <PercentBar percent={g.percent} />
        <div className="flex gap-4 mt-3 text-sm">
          <span>✅ Obyektiv: <b>{g.objective_score}</b></span>
          <span>🤖 AI: <b>{g.ai_score}</b></span>
          <AiBadge provider={g.ai_provider} />
        </div>
      </Card>

      <h2 className="font-semibold mb-2">Savollar bo'yicha</h2>
      <div className="space-y-3 mb-6">
        {g.breakdown.map((b) => (
          <Card key={b.question_id} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <Badge color={b.graded_by === 'ai' ? 'violet' : 'green'}>
                {b.graded_by === 'ai' ? '🤖 AI baho' : 'avto baho'}
              </Badge>
              <span className="text-sm font-semibold">{b.score} / {b.max}</span>
            </div>
            <div className="text-sm text-slate-600">Javobingiz: <i>{String(b.response ?? '—')}</i></div>
            {b.graded_by === 'auto' && b.correct === false && (
              <div className="text-sm text-red-600 mt-1">To'g'ri javob: {String(b.expected)}</div>
            )}
            {b.graded_by === 'ai' && (
              <div className="mt-2 bg-violet-50 border border-violet-100 rounded-lg p-3">
                <div className="text-sm text-violet-900">{b.rationale}</div>
                {b.suggestions && b.suggestions.length > 0 && (
                  <ul className="mt-1 text-xs text-violet-700 list-disc list-inside">
                    {b.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {feedback.length > 0 && (
        <>
          <h2 className="font-semibold mb-2">O'qituvchi feedback'i</h2>
          {feedback.map((f) => (
            <Card key={f.id} className="p-4 mb-2 border-l-4 border-l-amber-400">
              <div className="text-sm">⭐ {f.rating}/5</div>
              <div className="text-sm text-slate-700 mt-1">{f.comment}</div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
