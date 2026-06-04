import { useEffect, useState } from 'react';

import { Card, PercentBar, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { StudentAnalytics } from '@/lib/types';

export default function Dashboard() {
  const { user } = useAuth();
  const [a, setA] = useState<StudentAnalytics | null>(null);

  useEffect(() => {
    if (user) api.get<StudentAnalytics>(`/analytics/student/${user.id}`).then(setA);
  }, [user]);

  if (!a) return <div className="text-slate-400">Yuklanmoqda…</div>;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Salom, {user?.name} 👋</h1>
      <p className="text-slate-500 mb-5">Sizning o'quv ko'rsatkichlaringiz</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Umumiy natija" value={`${a.overall_percent}%`} />
        <Stat label="Topshiriqlar" value={a.total_attempts} />
        <Stat label="Fanlar" value={a.subjects.length} />
      </div>

      <h2 className="font-semibold mb-3">Fanlar bo'yicha</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {a.subjects.map((s) => (
          <Card key={s.subject.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{s.subject.icon}</span>
                <span className="font-medium">{s.subject.name}</span>
              </div>
              <span className="text-sm font-bold">{s.percent}%</span>
            </div>
            <PercentBar percent={s.percent} color={s.subject.color} />
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>{s.attempts} urinish</span>
              <span>🤖 AI: {s.ai_percent}%</span>
              {s.avg_teacher_rating != null && <span>⭐ {s.avg_teacher_rating} ({s.feedback_count})</span>}
            </div>
          </Card>
        ))}
        {a.subjects.length === 0 && <p className="text-slate-400 text-sm">Hali topshiriq bajarmadingiz.</p>}
      </div>

      <h2 className="font-semibold mb-3">So'nggi faoliyat</h2>
      <Card className="divide-y divide-slate-100">
        {a.recent.map((r) => (
          <div key={r.submission_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <div className="font-medium">{r.assignment}</div>
              <div className="text-xs text-slate-400">{r.subject}</div>
            </div>
            <span className="font-semibold">{r.percent}%</span>
          </div>
        ))}
        {a.recent.length === 0 && <div className="px-4 py-3 text-slate-400 text-sm">Bo'sh</div>}
      </Card>
    </div>
  );
}
