import { useEffect, useState } from 'react';

import { Card, PercentBar, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Subject } from '@/lib/types';

interface SubjectAnalytics {
  subject: { id: number; name: string; icon: string } | null;
  students: number;
  submissions: number;
  avg_percent: number;
  leaderboard: { student_id: number; name: string; percent: number; attempts: number }[];
}

interface AiStatus {
  provider: string;
  reachable: boolean;
  model: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [a, setA] = useState<SubjectAnalytics | null>(null);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (!user?.subject_id) return;
    api.get<SubjectAnalytics>(`/analytics/subject/${user.subject_id}`).then(setA);
    api.get<AiStatus>('/ai/status').then(setAi);
    api.get<Subject[]>('/subjects').then((s) => setSubject(s.find((x) => x.id === user.subject_id) ?? null));
  }, [user]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {subject?.icon} {subject?.name ?? 'Fan'} — boshqaruv
          </h1>
          <p className="text-slate-500">O'qituvchi: {user?.name}</p>
        </div>
        {ai && (
          <div className={`text-xs px-3 py-2 rounded-lg ${ai.reachable ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>
            AI: {ai.reachable ? `🤖 Ollama (${ai.model})` : '⚙️ Fallback rejimi'}
          </div>
        )}
      </div>

      {a && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Stat label="O'rtacha natija" value={`${a.avg_percent}%`} />
            <Stat label="O'quvchilar" value={a.students} />
            <Stat label="Topshirishlar" value={a.submissions} />
          </div>

          <h2 className="font-semibold mb-3">Reyting</h2>
          <Card className="divide-y divide-slate-100">
            {a.leaderboard.map((s, i) => (
              <div key={s.student_id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-6 text-slate-400">{i + 1}</span>
                <span className="flex-1 text-sm font-medium">{s.name}</span>
                <div className="w-32">
                  <PercentBar percent={s.percent} />
                </div>
                <span className="w-12 text-right text-sm font-semibold">{s.percent}%</span>
              </div>
            ))}
            {a.leaderboard.length === 0 && <div className="px-4 py-3 text-slate-400 text-sm">Hali topshirish yo'q</div>}
          </Card>
        </>
      )}
    </div>
  );
}
