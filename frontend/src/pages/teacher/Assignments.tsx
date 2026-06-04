import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge, Card, PercentBar } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Assignment, AssignmentProgress, AssignmentProgressResponse, Method } from '@/lib/types';

function barColor(pct: number): string {
  if (pct >= 75) return '#16a34a';
  if (pct >= 50) return '#d97706';
  return '#dc2626';
}

export default function Assignments() {
  const { user } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [methods, setMethods] = useState<Record<string, Method>>({});
  const [progress, setProgress] = useState<Record<number, AssignmentProgress>>({});

  useEffect(() => {
    if (!user) return;
    api.get<Method[]>('/meta/methods').then((m) => setMethods(Object.fromEntries(m.map((x) => [x.id, x]))));
    api.get<Assignment[]>(`/assignments?teacher_id=${user.id}`).then(setItems);
    api
      .get<AssignmentProgressResponse>(`/analytics/assignments?teacher_id=${user.id}`)
      .then((r) => setProgress(Object.fromEntries(r.assignments.map((a) => [a.id, a]))));
  }, [user]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Vazifalarim</h1>
        <div className="flex items-center gap-2">
          <Link to="/teacher/statistics" className="text-sm border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
            📊 Statistika
          </Link>
          <Link to="/teacher/create" className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
            ➕ Yangi vazifa
          </Link>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((a) => {
          const method = methods[a.method];
          const aiCount = a.questions.filter((q) => q.ai_graded || q.type === 'short' || q.type === 'essay').length;
          const p = progress[a.id];
          return (
            <Card key={a.id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.title}</span>
                {method && <Badge color="violet">{method.icon} {method.name}</Badge>}
                {p && (
                  <span className="ml-auto text-xs font-semibold text-slate-500">
                    {p.submitted}/{p.assigned} topshirdi
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {a.questions.length} savol · {aiCount > 0 ? `${aiCount} ta AI baholanadi` : 'hammasi avto'}
              </div>
              {p && (
                <div className="flex items-center gap-3 mt-2.5">
                  <div className="flex-1">
                    <PercentBar percent={p.completion} color={barColor(p.completion)} />
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {p.completion}% · Ø {p.avg_percent}%
                  </span>
                </div>
              )}
            </Card>
          );
        })}
        {items.length === 0 && <p className="text-slate-400 text-sm">Hali vazifa yaratmadingiz.</p>}
      </div>
    </div>
  );
}
