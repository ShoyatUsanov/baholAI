import { useEffect, useState, type ReactNode } from 'react';

import HelpBanner from '@/components/HelpBanner';
import { PageHeader } from '@/components/Layout';
import { Badge, Card, Empty, PercentBar, Spinner, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type {
  AssignmentProgress,
  AssignmentProgressResponse,
  StudentAnalytics,
  Subject,
  TeacherStudentRow,
  TeacherStudentsResponse,
} from '@/lib/types';

type Tab = 'assignments' | 'students';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function barColor(pct: number): string {
  if (pct >= 75) return '#16a34a';
  if (pct >= 50) return '#d97706';
  return '#dc2626';
}

export default function Statistics() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('assignments');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [prog, setProg] = useState<AssignmentProgressResponse | null>(null);
  const [roster, setRoster] = useState<TeacherStudentsResponse | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<AssignmentProgressResponse>(`/analytics/assignments?teacher_id=${user.id}`).then(setProg);
    if (user.subject_id) {
      api.get<TeacherStudentsResponse>(`/analytics/students?subject_id=${user.subject_id}`).then(setRoster);
      api.get<Subject[]>('/subjects').then((s) => setSubject(s.find((x) => x.id === user.subject_id) ?? null));
    }
  }, [user]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Statistika"
        description={subject ? `${subject.icon} ${subject.name} — o'quvchilar va vazifalar tahlili` : "O'quvchilar va vazifalar tahlili"}
      />

      <HelpBanner id="statistics">
        💡 <b>Vazifalar</b> tabida har bir vazifani kim bajardi/bajarmadi ko'rasiz;
        <b> O'quvchilar</b> tabida esa har bir o'quvchining umumiy ko'rsatkichi.
      </HelpBanner>

      <div className="flex gap-2 mb-5">
        <TabBtn active={tab === 'assignments'} onClick={() => setTab('assignments')}>
          📋 Vazifalar
        </TabBtn>
        <TabBtn active={tab === 'students'} onClick={() => setTab('students')}>
          👥 O'quvchilar
        </TabBtn>
      </div>

      {tab === 'assignments' ? <AssignmentsTab data={prog} /> : <StudentsTab data={roster} />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
        active
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Vazifalar */
function AssignmentsTab({ data }: { data: AssignmentProgressResponse | null }) {
  if (!data) return <Spinner />;
  const t = data.totals;
  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Vazifalar" value={t.assignments} />
        <Stat label="Topshirilgan" value={`${t.submitted}/${t.assigned}`} hint="jami / berilgan" />
        <Stat label="Bajarilish" value={`${t.completion}%`} />
      </div>
      {data.assignments.length === 0 ? (
        <Empty>Hali vazifa yaratmadingiz.</Empty>
      ) : (
        <div className="space-y-3">
          {data.assignments.map((a) => (
            <AssignmentCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </>
  );
}

function AssignmentCard({ a }: { a: AssignmentProgress }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{a.title}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {a.questions} savol · yaratilgan {fmtDate(a.created_at)}
            {a.last_submission && ` · oxirgi topshiriq ${fmtDate(a.last_submission)}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold">{a.submitted}/{a.assigned}</div>
          <div className="text-xs text-slate-400">topshirdi</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1">
          <PercentBar percent={a.completion} color={barColor(a.completion)} />
        </div>
        <span className="text-xs text-slate-500 w-28 text-right">
          {a.completion}% bajarildi
        </span>
      </div>

      <div className="flex items-center gap-2 mt-3 text-xs">
        <Badge color="green">✓ {a.submitted} qildi</Badge>
        <Badge color={a.pending ? 'amber' : 'slate'}>⏳ {a.pending} kutilmoqda</Badge>
        <Badge color="violet">Ø {a.avg_percent}% o'rtacha</Badge>
        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {open ? 'Yopish' : "Kim qildi / qilmadi"}
        </button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">
              ✓ Topshirganlar ({a.done_students.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {a.done_students.map((s) => (
                <span key={s.id} className="text-xs px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  {s.name}
                </span>
              ))}
              {a.done_students.length === 0 && <span className="text-xs text-slate-400">—</span>}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
              ⏳ Qilmaganlar ({a.pending_students.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {a.pending_students.map((s) => (
                <span key={s.id} className="text-xs px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  {s.name}
                </span>
              ))}
              {a.pending_students.length === 0 && <span className="text-xs text-slate-400">Hammasi topshirdi 🎉</span>}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* --------------------------------------------------------------- O'quvchilar */
function StudentsTab({ data }: { data: TeacherStudentsResponse | null }) {
  if (!data) return <Spinner />;
  const engaged = data.students.filter((s) => s.engaged).length;
  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="O'quvchilar" value={data.students.length} />
        <Stat label="Faol" value={engaged} hint="kamida 1 vazifa topshirgan" />
        <Stat label="Vazifalar" value={data.total_assignments} />
      </div>
      {data.students.length === 0 ? (
        <Empty>O'quvchilar topilmadi.</Empty>
      ) : (
        <div className="space-y-2">
          {data.students.map((s) => (
            <StudentRow key={s.student_id} s={s} />
          ))}
        </div>
      )}
    </>
  );
}

function StudentRow({ s }: { s: TeacherStudentRow }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<StudentAnalytics | null>(null);

  const toggle = () => {
    setOpen((o) => !o);
    if (!detail) api.get<StudentAnalytics>(`/analytics/student/${s.student_id}`).then(setDetail);
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={toggle}>
        <div className="w-9 h-9 rounded-full bg-primary-600 text-white grid place-items-center text-sm font-bold uppercase shrink-0">
          {s.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-2">
            {s.name}
            {!s.engaged && <Badge color="slate">boshlamagan</Badge>}
          </div>
          <div className="text-xs text-slate-400">
            {s.level ?? 'daraja yo\'q'} · {s.completed_assignments}/{s.total_assignments} vazifa
            {s.last_activity && ` · oxirgi ${fmtDate(s.last_activity)}`}
          </div>
        </div>
        <div className="w-24 hidden sm:block">
          <PercentBar percent={s.percent} color={barColor(s.percent)} />
        </div>
        <div className="text-right shrink-0 w-12">
          <div className="text-sm font-semibold">{s.percent}%</div>
          {s.avg_rating != null && <div className="text-xs text-amber-500">⭐ {s.avg_rating}</div>}
        </div>
      </div>

      {open && (
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
          {!detail ? (
            <div className="text-sm text-slate-400">Yuklanmoqda…</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                <MiniStat label="Umumiy" value={`${detail.overall_percent}%`} />
                <MiniStat label="Urinishlar" value={detail.total_attempts} />
                <MiniStat label="XP" value={s.xp} />
              </div>

              {detail.subjects.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">Fanlar bo'yicha</div>
                  <div className="space-y-1.5">
                    {detail.subjects.map((b) => (
                      <div key={b.subject.id} className="flex items-center gap-2 text-sm">
                        <span className="w-40 truncate">{b.subject.icon} {b.subject.name}</span>
                        <div className="flex-1"><PercentBar percent={b.percent} color={barColor(b.percent)} /></div>
                        <span className="w-10 text-right text-xs font-medium">{b.percent}%</span>
                        {b.avg_teacher_rating != null && <span className="text-xs text-amber-500 w-10">⭐{b.avg_teacher_rating}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.recent.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">So'nggi topshiriqlar</div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {detail.recent.slice(0, 5).map((r) => (
                      <div key={r.submission_id} className="flex items-center justify-between py-1.5 text-sm">
                        <span className="truncate flex-1">{r.assignment} <span className="text-slate-400">· {r.subject}</span></span>
                        <span className="font-medium ml-2">{r.percent}%</span>
                        <span className="text-xs text-slate-400 ml-2 w-14 text-right">{fmtDate(r.submitted_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.subjects.length === 0 && detail.recent.length === 0 && (
                <div className="text-sm text-slate-400">Bu o'quvchi hali topshiriq topshirmagan.</div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 py-2">
      <div className="text-base font-bold">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
