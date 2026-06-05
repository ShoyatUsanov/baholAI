import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, ShieldAlert, ShieldCheck } from 'lucide-react';

import HelpBanner from '@/components/HelpBanner';
import { useToast } from '@/components/Toast';
import { AiBadge, Badge, Button, Card, ConfidenceBadge, EmptyState, InfoTooltip, PageHeader, PercentBar, RubricBreakdown } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { GRADED_BY, HINTS } from '@/lib/labels';
import type {
  Assignment,
  GradeBreakdown,
  OriginalityReport,
  Question,
  Submission,
  Subject,
} from '@/lib/types';

function fmtResponse(r: unknown): string {
  if (r == null || r === '') return '—';
  if (Array.isArray(r)) return r.join(', ');
  return String(r);
}

type OrigLevel = 'green' | 'amber' | 'red';

// Severity of the originality signal — flagged is red, a single elevated signal
// is amber, otherwise green. A hint for the teacher, never an automatic penalty.
function origLevel(o?: OriginalityReport | null): OrigLevel | null {
  if (!o) return null;
  if (o.flagged) return 'red';
  if (o.similarity >= 40 || o.ai_likelihood >= 50) return 'amber';
  return 'green';
}

function origBarColor(pct: number): string {
  if (pct >= 60) return '#dc2626';
  if (pct >= 40) return '#d97706';
  return '#16a34a';
}

export default function Grading() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [active, setActive] = useState<Assignment | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [subject, setSubject] = useState<Subject | null>(null);
  const [onlyReview, setOnlyReview] = useState(false);

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

  const loadSubs = useCallback(() => {
    if (active) api.get<Submission[]>(`/submissions?assignment_id=${active.id}`).then(setSubs);
  }, [active]);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  const reviewCount = subs.filter((s) => s.grade?.needs_review).length;
  const shown = onlyReview ? subs.filter((s) => s.grade?.needs_review) : subs;

  // Map question id → question (so the teacher sees each prompt next to the answer).
  const questionsById: Record<string, Question> = Object.fromEntries((active?.questions ?? []).map((q) => [q.id, q]));
  // Map submission id → student name, so an originality match can name the peer.
  const subNameById: Record<number, string> = Object.fromEntries(
    subs.map((s) => [s.id, names[s.student_id] ?? `O'quvchi #${s.student_id}`]),
  );

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Baholash"
        description={`${subject ? subject.name + ' · ' : ''}O'quvchilar javoblarini ko'ring, AI taklifini tasdiqlang yoki tahrirlang.`}
      />
      <HelpBanner id="grading">
        💡 Maslahat: AI ochiq javoblarni baholaydi, siz <b>tasdiqlaysiz</b> yoki ballni <b>tahrirlaysiz</b>.
        Faqat <b>o'zingiz</b> dars beradigan fan topshiriqlari ko'rinadi. Past ishonchli baholar
        «Ko'rib chiqish kerak» deb belgilanadi.
      </HelpBanner>

      {assignments.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Hali vazifa yaratmadingiz"
          description="O'quvchilar javoblarini baholash uchun avval vazifa yarating."
        />
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

          {subs.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setOnlyReview((v) => !v)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  onlyReview
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                ⚠️ Ko'rib chiqish kerak ({reviewCount})
              </button>
              {onlyReview && (
                <button onClick={() => setOnlyReview(false)} className="text-sm text-slate-500 hover:underline">
                  Hammasini ko'rsatish
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {shown.map((s) => (
              <GradeRow
                key={s.id}
                sub={s}
                studentName={names[s.student_id] ?? `O'quvchi #${s.student_id}`}
                subjectName={subject?.name ?? 'Fan'}
                questionsById={questionsById}
                subNameById={subNameById}
                onChanged={loadSubs}
              />
            ))}
            {active && subs.length === 0 && <p className="text-slate-400 text-sm">Bu vazifaga topshirish yo'q.</p>}
            {active && subs.length > 0 && shown.length === 0 && (
              <p className="text-slate-400 text-sm">Ko'rib chiqish kerak bo'lgan topshiriq yo'q. 🎉</p>
            )}
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
  subNameById,
  onChanged,
}: {
  sub: Submission;
  studentName: string;
  subjectName: string;
  questionsById: Record<string, Question>;
  subNameById: Record<number, string>;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [origOpen, setOrigOpen] = useState(false);
  const g = sub.grade;
  const pct = g?.percent ?? 0;
  const breakdown = g?.breakdown ?? [];
  const rubric = g?.rubric_breakdown ?? [];
  const orig = sub.originality;
  const lvl = origLevel(orig);

  const [editing, setEditing] = useState(false);
  const [aiVal, setAiVal] = useState(g?.ai_score ?? 0);
  const [savingGrade, setSavingGrade] = useState(false);

  const saveGrade = async () => {
    setSavingGrade(true);
    try {
      await api.patch(`/submissions/${sub.id}/grade`, { ai_score: aiVal });
      setEditing(false);
      onChanged();
      toast.success('AI ball saqlandi');
    } finally {
      setSavingGrade(false);
    }
  };

  const [approving, setApproving] = useState(false);
  const approve = async () => {
    setApproving(true);
    try {
      await api.post(`/submissions/${sub.id}/grade/approve`);
      onChanged();
      toast.success("Baho tasdiqlandi — o'quvchiga ko'rinadi");
    } finally {
      setApproving(false);
    }
  };

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
      toast.success('Feedback yuborildi');
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
        <div className="flex items-center gap-2 text-sm flex-wrap justify-end">
          {lvl && <OriginalityChip level={lvl} open={origOpen} onClick={() => setOrigOpen((o) => !o)} />}
          {g?.needs_review && (
            <span className="inline-flex items-center gap-0.5">
              <Badge color="amber">⚠️ Ko'rib chiqish</Badge>
              <InfoTooltip text={HINTS.needs_review} />
            </span>
          )}
          <span className="font-semibold">{pct}%</span>
          <span className="inline-flex items-center gap-0.5">
            <Badge color="green">avto {g?.objective_score}</Badge>
            <InfoTooltip text={HINTS.objective_score} />
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Badge color="violet">🤖 {g ? Math.round(g.total_score - g.objective_score) : 0}</Badge>
            <InfoTooltip text={HINTS.ai_score} />
          </span>
          {g && (
            <span className="inline-flex items-center gap-0.5">
              <ConfidenceBadge value={g.confidence} />
              <InfoTooltip text={HINTS.confidence} />
            </span>
          )}
          {g?.was_changed && <Badge color="slate">✎ tuzatildi (AI: {g.ai_score})</Badge>}
          {g && <AiBadge provider={g.ai_provider} />}
        </div>
      </div>

      {origOpen && orig && <OriginalityPanel orig={orig} subNameById={subNameById} />}

      {g?.status === 'pending' && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-2.5">
          <span className="text-sm text-amber-800 dark:text-amber-200 flex-1">
            ⏳ Draft — o'quvchiga hali ko'rinmaydi. AI bahosini tasdiqlaysizmi?
          </span>
          <Button onClick={approve} disabled={approving} className="whitespace-nowrap">
            {approving ? '…' : '✓ Tasdiqlash'}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1"><PercentBar percent={pct} /></div>
        <button onClick={() => setOpen((o) => !o)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
          {open ? 'Javoblarni yashirish' : '📄 Javoblarni ko\'rish'}
        </button>
      </div>

      {rubric.length > 0 && (
        <div className="mb-3 rounded-lg bg-violet-50/60 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-violet-900 dark:text-violet-200">🧠 AI rubrika bahosi</div>
            {!editing ? (
              <button
                onClick={() => { setAiVal(g ? Math.round((g.total_score - g.objective_score) * 10) / 10 : 0); setEditing(true); }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                ✎ AI ballini tuzatish
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={aiVal}
                  onChange={(e) => setAiVal(Number(e.target.value))}
                  className="w-16 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded px-2 py-1 text-sm"
                />
                <Button onClick={saveGrade} disabled={savingGrade} className="text-xs">
                  {savingGrade ? '…' : 'Saqlash'}
                </Button>
                <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:underline">Bekor</button>
              </div>
            )}
          </div>
          <RubricBreakdown items={rubric} />
        </div>
      )}

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

const CHIP_STYLES: Record<OrigLevel, string> = {
  green: 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-300',
  amber: 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300',
  red: 'border-red-200 text-red-700 dark:border-red-800 dark:text-red-300',
};
const CHIP_LABEL: Record<OrigLevel, string> = { green: 'Original', amber: "E'tibor", red: 'Shubhali' };

function OriginalityChip({ level, open, onClick }: { level: OrigLevel; open: boolean; onClick: () => void }) {
  const Icon = level === 'green' ? ShieldCheck : ShieldAlert;
  return (
    <button
      onClick={onClick}
      title="Original'lik tekshiruvi"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 ${CHIP_STYLES[level]} ${open ? 'ring-1 ring-current' : ''}`}
    >
      <Icon size={14} />
      {CHIP_LABEL[level]}
    </button>
  );
}

function OriginalityPanel({
  orig,
  subNameById,
}: {
  orig: OriginalityReport;
  subNameById: Record<number, string>;
}) {
  const matched = orig.matched_submission_ids ?? [];
  const topName = matched.length ? subNameById[matched[0]] ?? `#${matched[0]}` : null;
  const extra = matched.slice(1).map((id) => subNameById[id] ?? `#${id}`);
  return (
    <div className="mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-3 text-sm space-y-2">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Nusxa o'xshashligi</span>
            <span className="font-semibold">{orig.similarity}%</span>
          </div>
          <PercentBar percent={orig.similarity} color={origBarColor(orig.similarity)} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">AI-yozilgan ehtimoli</span>
            <span className="font-semibold">{orig.ai_likelihood}%</span>
          </div>
          <PercentBar percent={orig.ai_likelihood} color={origBarColor(orig.ai_likelihood)} />
        </div>
      </div>

      {topName && (
        <div className="text-slate-600 dark:text-slate-300">
          🔗 O'xshash: <span className="font-medium">{topName}</span> bilan {orig.similarity}%
          {extra.length > 0 && <span className="text-slate-400"> · yana {extra.join(', ')}</span>}
        </div>
      )}

      <div className="text-xs text-slate-400">
        Bu faqat signal. Yakuniy qaror o'qituvchida.
      </div>
    </div>
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
        <div className="flex items-center gap-1 shrink-0">
          <Badge color={b.graded_by === 'ai' ? 'violet' : 'green'}>
            {b.graded_by === 'ai' ? '🤖 ' : ''}{GRADED_BY[b.graded_by]?.label ?? b.graded_by}
          </Badge>
          <InfoTooltip text={GRADED_BY[b.graded_by]?.hint ?? ''} />
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
