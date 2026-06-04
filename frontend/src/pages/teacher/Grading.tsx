import { useEffect, useState } from 'react';

import { AiBadge, Badge, Button, Card, PercentBar } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Assignment, GradeBreakdown, Question, Submission, Subject } from '@/lib/types';

function fmtResponse(r: unknown): string {
  if (r == null || r === '') return '—';
  if (Array.isArray(r)) return r.join(', ');
  return String(r);
}

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

  // Map question id → question (so the teacher sees each prompt next to the answer).
  const questionsById: Record<string, Question> = Object.fromEntries((active?.questions ?? []).map((q) => [q.id, q]));

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Baholash va feedback</h1>
      <p className="text-slate-500 mb-4">O'quvchilarning javoblarini ko'ring va feedback yuboring</p>

      {assignments.length === 0 ? (
        <p className="text-slate-400 text-sm">Hali vazifa yaratmadingiz.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {assignments.map((a) => (
              <button
                key={a.id}
                onClick={() => setActive(a)}
                className={`text-sm px-3 py-1.5 rounded-lg border ${
                  active?.id === a.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                questionsById={questionsById}
              />
            ))}
            {active && subs.length === 0 && <p className="text-slate-400 text-sm">Bu vazifaga topshirish yo'q.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function GradeRow({
  sub,
  studentName,
  subjectName,
  questionsById,
}: {
  sub: Submission;
  studentName: string;
  subjectName: string;
  questionsById: Record<string, Question>;
}) {
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const g = sub.grade;
  const pct = g?.percent ?? 0;
  const breakdown = g?.breakdown ?? [];

  const suggest = async () => {
    setAiBusy(true);
    try {
      const weak = breakdown
        .filter((b) => b.score < b.max)
        .map((b) => questionsById[b.question_id]?.prompt ?? b.question_id);
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
        <div>
          <div className="font-medium">{studentName}</div>
          <div className="text-xs text-slate-400">{new Date(sub.submitted_at).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{pct}%</span>
          <Badge color="green">avto {g?.objective_score}</Badge>
          <Badge color="violet">🤖 {g?.ai_score}</Badge>
          {g && <AiBadge provider={g.ai_provider} />}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1"><PercentBar percent={pct} /></div>
        <button onClick={() => setOpen((o) => !o)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
          {open ? 'Javoblarni yashirish' : '📄 Javoblarni ko\'rish'}
        </button>
      </div>

      {open && (
        <div className="mb-3 space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
          {breakdown.length === 0 && <div className="text-sm text-slate-400">Tafsilot yo'q.</div>}
          {breakdown.map((b, i) => (
            <AnswerRow key={b.question_id} b={b} idx={i} question={questionsById[b.question_id]} />
          ))}
        </div>
      )}

      {sent ? (
        <div className="text-sm text-green-700 dark:text-green-400">✓ Feedback yuborildi</div>
      ) : (
        <div className="flex items-start gap-2">
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-2 py-2 text-sm"
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
            className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
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

function AnswerRow({ b, idx, question }: { b: GradeBreakdown; idx: number; question?: Question }) {
  const wrong = b.graded_by === 'auto' && b.correct === false;
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-sm font-medium">
          {idx + 1}. {question?.prompt ?? `Savol ${b.question_id}`}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge color={b.graded_by === 'ai' ? 'violet' : 'green'}>
            {b.graded_by === 'ai' ? '🤖 AI' : 'avto'}
          </Badge>
          <span className={`text-sm font-semibold ${b.score >= b.max ? 'text-green-600' : wrong ? 'text-red-600' : 'text-amber-600'}`}>
            {b.score}/{b.max}
          </span>
        </div>
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-300">
        Javob: <i>{fmtResponse(b.response)}</i>
        {b.graded_by === 'auto' && (b.correct ? ' ✅' : ' ❌')}
      </div>
      {wrong && b.expected != null && (
        <div className="text-sm text-red-600 dark:text-red-400 mt-0.5">To'g'ri javob: {fmtResponse(b.expected)}</div>
      )}
      {b.graded_by === 'ai' && (b.rationale || (b.suggestions && b.suggestions.length > 0)) && (
        <div className="mt-2 bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 rounded-lg p-2.5">
          {b.rationale && <div className="text-sm text-violet-900 dark:text-violet-200">{b.rationale}</div>}
          {b.suggestions && b.suggestions.length > 0 && (
            <ul className="mt-1 text-xs text-violet-700 dark:text-violet-300 list-disc list-inside">
              {b.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
