import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

import HelpBanner from '@/components/HelpBanner';
import { useToast } from '@/components/Toast';
import { AiBadge, Badge, Button, Card, ConfidenceBadge, InfoTooltip, PercentBar, RubricBreakdown, VerificationBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { COACHING_HINT, GRADED_BY, HINTS } from '@/lib/labels';
import type { Appeal, Assignment, AuditEntry, CheckQuestion, Feedback, Question, Submission } from '@/lib/types';

const AUDIT_LABEL: Record<AuditEntry['action'], string> = {
  ai_graded: '🤖 AI baho qo\'ydi',
  teacher_edited: '✏️ O\'qituvchi ballni tuzatdi',
  approved: '✓ O\'qituvchi tasdiqladi',
  appeal_opened: '📨 E\'tiroz ochildi',
  appeal_resolved: '✅ E\'tiroz hal qilindi',
};

function fmtTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '';
}

export default function Result() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [sub, setSub] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const [ccqs, setCcqs] = useState<CheckQuestion[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [editAnswers, setEditAnswers] = useState<Record<string, string>>({});
  const [resubmitting, setResubmitting] = useState(false);

  const loadAppeals = useCallback(() => {
    api.get<Appeal[]>(`/appeals?submission_id=${submissionId}`).then(setAppeals);
  }, [submissionId]);

  useEffect(() => {
    api.get<Submission>(`/submissions/${submissionId}`).then(setSub);
    api.get<Feedback[]>(`/feedback?submission_id=${submissionId}`).then(setFeedback);
    api.get<AuditEntry[]>(`/submissions/${submissionId}/audit`).then(setAudit);
    loadAppeals();
  }, [submissionId, loadAppeals]);

  // Coaching: fetch the check-questions + assignment so the student can fix & resubmit.
  useEffect(() => {
    if (!sub || sub.status !== 'coaching') return;
    api.get<CheckQuestion[]>(`/submissions/${sub.id}/ccq`).then(setCcqs);
    api.get<Assignment>(`/assignments/${sub.assignment_id}`).then(setAssignment);
    setEditAnswers(Object.fromEntries(Object.entries(sub.answers).map(([k, v]) => [k, String(v ?? '')])));
  }, [sub]);

  const resubmit = async () => {
    if (!sub) return;
    setResubmitting(true);
    try {
      const next = await api.post<Submission>(`/submissions/${sub.id}/resubmit`, { answers: editAnswers });
      toast.success(next.status === 'coaching' ? 'Qayta topshirildi — yana bir savol bor' : 'Qayta topshirildi! ✓');
      navigate(`/student/result/${next.id}`);
    } finally {
      setResubmitting(false);
    }
  };

  const submitAppeal = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await api.post('/appeals', { submission_id: Number(submissionId), reason });
      setReason('');
      setShowForm(false);
      loadAppeals();
      toast.success("E'tiroz yuborildi — o'qituvchi ko'rib chiqadi");
    } finally {
      setBusy(false);
    }
  };

  if (!sub || !sub.grade) return <div className="text-slate-400">Yuklanmoqda…</div>;
  const g = sub.grade;
  const myAppeal = appeals[0] ?? null;
  const coaching = sub.status === 'coaching';
  const openQuestions: Question[] = (assignment?.questions ?? []).filter(
    (q) => q.ai_graded || q.type === 'short' || q.type === 'essay',
  );

  return (
    <div className="max-w-2xl">
      <Link to="/student/assignments" className="text-sm text-slate-500 hover:text-indigo-600">← Vazifalar</Link>
      <h1 className="text-2xl font-bold mt-2 mb-3">Natija</h1>
      <HelpBanner id="result">
        💡 Har bir ball <b>nima uchun</b> qo'yilgani izohlangan. Variant savollar avtomatik,
        ochiq javoblar AI tomonidan baholanadi va <b>o'qituvchi tasdiqlaydi</b>. Rozi bo'lmasangiz —
        pastdan <b>e'tiroz</b> bildiring.
      </HelpBanner>

      {coaching && (
        <Card className="p-5 mb-5 border-l-4 border-l-primary-500 bg-primary-50/40 dark:bg-primary-900/10">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient grid place-items-center shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg">Deyarli to'g'ri! 🎯</h2>
                <InfoTooltip text={COACHING_HINT} />
                {assignment && (
                  <Badge color="indigo">{assignment.max_attempts} dan {sub.attempt_no ?? 1}-urinish</Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                Quyidagi savol(lar)ga e'tibor berib javobingizni yaxshilang va qayta topshiring.
                Bu hali o'qituvchiga yuborilmadi — avval o'zingiz tuzatib ko'ring.
              </p>
            </div>
          </div>

          {ccqs.length > 0 && (
            <div className="space-y-2 mb-4">
              {ccqs.map((c) => (
                <div key={c.id} className="rounded-lg bg-white dark:bg-slate-800 border border-primary-100 dark:border-primary-900/40 p-3">
                  <div className="text-xs text-primary-600 dark:text-primary-400 font-medium mb-0.5">❓ {c.criterion}</div>
                  <div className="text-sm text-slate-700 dark:text-slate-200">{c.question_text}</div>
                </div>
              ))}
            </div>
          )}

          {openQuestions.map((q) => (
            <div key={q.id} className="mb-3">
              <div className="text-sm font-medium mb-1">{q.prompt}</div>
              <textarea
                value={editAnswers[q.id] ?? ''}
                onChange={(e) => setEditAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                rows={3}
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}

          <Button onClick={resubmit} disabled={resubmitting}>
            {resubmitting ? 'Topshirilmoqda…' : '🔄 Qayta topshirish'}
          </Button>
        </Card>
      )}

      {coaching ? null : g.status === 'pending' ? (
        <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
          ⏳ Natija o'qituvchi tasdig'ini kutmoqda. Quyidagi balllar AI taklifi — yakuniy emas.
        </div>
      ) : (
        g.rubric_breakdown?.length > 0 && (
          <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-300">
            ✓ Natija o'qituvchi tomonidan tasdiqlangan.
          </div>
        )
      )}

      <Card className="p-5 mb-5">
        <div className="flex items-end justify-between mb-2">
          <div className="text-4xl font-bold">{g.percent}%</div>
          <div className="text-sm text-slate-500">{g.total_score} / {g.max_score} ball</div>
        </div>
        <PercentBar percent={g.percent} />
        <div className="flex gap-4 mt-3 text-sm items-center flex-wrap">
          <span>✅ Obyektiv: <b>{g.objective_score}</b></span>
          <span>🤖 AI: <b>{Math.round(g.total_score - g.objective_score)}</b></span>
          {typeof g.confidence === 'number' && g.rubric_breakdown?.length > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <ConfidenceBadge value={g.confidence} />
              <InfoTooltip text={HINTS.confidence} />
            </span>
          )}
          <AiBadge provider={g.ai_provider} />
        </div>
      </Card>

      {g.rubric_breakdown && g.rubric_breakdown.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h2 className="font-semibold">🧠 AI rubrika bahosi</h2>
            <VerificationBadge items={g.rubric_breakdown} />
          </div>
          <Card className="p-4 mb-6">
            <RubricBreakdown items={g.rubric_breakdown} />
          </Card>
        </>
      )}

      <h2 className="text-lg font-semibold mb-2">Savollar bo'yicha</h2>
      <div className="space-y-3 mb-6">
        {g.breakdown.map((b) => (
          <Card key={b.question_id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1">
                <Badge color={b.graded_by === 'ai' ? 'violet' : 'green'}>
                  {b.graded_by === 'ai' ? '🤖 ' : ''}{GRADED_BY[b.graded_by]?.label ?? b.graded_by}
                </Badge>
                <InfoTooltip text={GRADED_BY[b.graded_by]?.hint ?? ''} />
              </span>
              <span className={`text-lg font-bold ${b.score >= b.max ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {b.score} / {b.max}
              </span>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">Sizning javobingiz</div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-5 py-4 max-h-72 overflow-y-auto">
              <p className="text-answer text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">
                {String(b.response ?? '—')}
              </p>
            </div>
            {b.graded_by === 'auto' && b.correct === false && (
              <div className="text-base text-red-600 dark:text-red-400 mt-2">To'g'ri javob: {String(b.expected)}</div>
            )}
            {b.graded_by === 'ai' && (
              <div className="mt-3 bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 rounded-lg p-3">
                <div className="text-base text-violet-900 dark:text-violet-200">{b.rationale}</div>
                {b.suggestions && b.suggestions.length > 0 && (
                  <ul className="mt-1.5 text-sm text-violet-700 dark:text-violet-300 list-disc list-inside space-y-0.5">
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
          <h2 className="text-lg font-semibold mb-2">O'qituvchi feedback'i</h2>
          {feedback.map((f) => (
            <Card key={f.id} className="p-4 mb-2 border-l-4 border-l-amber-400">
              <div className="text-base">⭐ {f.rating}/5</div>
              <div className="text-base text-slate-700 dark:text-slate-200 mt-1">{f.comment}</div>
            </Card>
          ))}
        </>
      )}

      {!coaching && (
      <>
      <h2 className="text-lg font-semibold mb-2">Bahoga e'tiroz</h2>
      <Card className="p-4 mb-6">
        {myAppeal ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge color={myAppeal.status === 'open' ? 'amber' : 'green'}>
                {myAppeal.status === 'open' ? "⏳ Ko'rib chiqilmoqda" : '✅ Hal qilindi'}
              </Badge>
              <span className="text-xs text-slate-400">{fmtTime(myAppeal.created_at)}</span>
            </div>
            <div className="text-sm"><span className="text-slate-500">Sababingiz:</span> {myAppeal.reason}</div>
            {myAppeal.teacher_response && (
              <div className="text-sm bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg p-3">
                <span className="font-medium">O'qituvchi javobi:</span> {myAppeal.teacher_response}
              </div>
            )}
          </div>
        ) : showForm ? (
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Nega bu bahoga rozi emassiz? Sababini yozing…"
              className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={submitAppeal} disabled={busy || !reason.trim()}>
                {busy ? 'Yuborilmoqda…' : "E'tirozni yuborish"}
              </Button>
              <button onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:underline">
                Bekor
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              Baho adolatsiz deb hisoblasangiz, o'qituvchiga e'tiroz bildiring.
            </div>
            <Button variant="outline" onClick={() => setShowForm(true)} className="whitespace-nowrap">
              Bahoga e'tiroz bildirish
            </Button>
          </div>
        )}
      </Card>
      </>
      )}

      {audit.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-2">Qaror jurnali</h2>
          <Card className="p-4 mb-6">
            <p className="text-xs text-slate-400 mb-3">
              Qora quti emas — bahoyingiz ustidagi har bir qaror qayd etiladi.
            </p>
            <div className="space-y-2">
              {audit.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{AUDIT_LABEL[e.action] ?? e.action}</span>
                  {e.user_name && <span className="text-xs text-slate-400">{e.user_name}</span>}
                  <span className="text-xs text-slate-400">{fmtTime(e.created_at)}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
