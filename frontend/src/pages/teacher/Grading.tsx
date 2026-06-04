import { useEffect, useState } from 'react';

import { AiBadge, Badge, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Assignment, Submission, Subject } from '@/lib/types';

export default function Grading() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [active, setActive] = useState<Assignment | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [subject, setSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<Assignment[]>(`/assignments?teacher_id=${user.id}`).then((a) => {
      setAssignments(a);
      if (a.length) setActive(a[0]);
    });
    if (user.subject_id) {
      api.get<{ leaderboard: { student_id: number; name: string }[] }>(`/analytics/subject/${user.subject_id}`)
        .then((d) => setNames(Object.fromEntries(d.leaderboard.map((s) => [s.student_id, s.name]))));
      api.get<Subject[]>('/subjects').then((s) => setSubject(s.find((x) => x.id === user.subject_id) ?? null));
    }
  }, [user]);

  useEffect(() => {
    if (active) api.get<Submission[]>(`/submissions?assignment_id=${active.id}`).then(setSubs);
  }, [active]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Baholash va feedback</h1>

      <div className="flex flex-wrap gap-2 mb-5">
        {assignments.map((a) => (
          <button
            key={a.id}
            onClick={() => setActive(a)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              active?.id === a.id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 hover:bg-slate-50'
            }`}
          >
            {a.title}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {subs.map((s) => (
          <GradeRow
            key={s.id}
            sub={s}
            studentName={names[s.student_id] ?? `O'quvchi #${s.student_id}`}
            subjectName={subject?.name ?? 'Fan'}
          />
        ))}
        {active && subs.length === 0 && <p className="text-slate-400 text-sm">Bu vazifaga topshirish yo'q.</p>}
      </div>
    </div>
  );
}

function GradeRow({ sub, studentName, subjectName }: { sub: Submission; studentName: string; subjectName: string }) {
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const g = sub.grade;
  const pct = g?.percent ?? 0;

  const suggest = async () => {
    setAiBusy(true);
    try {
      const weak = (g?.breakdown ?? [])
        .filter((b) => b.score < b.max)
        .map((b) => b.question_id);
      const res = await api.post<{ comment: string }>('/ai/feedback', {
        student_name: studentName,
        subject: subjectName,
        score_pct: pct,
        weak_points: weak,
      });
      setComment(res.comment);
    } finally {
      setAiBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    try {
      await api.post('/feedback', { submission_id: sub.id, rating, comment });
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{studentName}</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{pct}%</span>
          <Badge color="green">avto {g?.objective_score}</Badge>
          <Badge color="violet">🤖 {g?.ai_score}</Badge>
          {g && <AiBadge provider={g.ai_provider} />}
        </div>
      </div>

      {sent ? (
        <div className="text-sm text-green-700">✓ Feedback yuborildi</div>
      ) : (
        <div className="flex items-start gap-2">
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>⭐ {r}</option>
            ))}
          </select>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Feedback yozing yoki AI'dan taklif oling…"
            rows={2}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex flex-col gap-2">
            <Button variant="ai" onClick={suggest} disabled={aiBusy} className="whitespace-nowrap">
              {aiBusy ? '…' : '🤖 AI taklif'}
            </Button>
            <Button onClick={send} disabled={busy || !comment}>
              Yuborish
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
