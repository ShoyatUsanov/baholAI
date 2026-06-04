import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Assignment, Method, Submission, Subject } from '@/lib/types';

export default function Assignments() {
  const { user } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Record<number, Subject>>({});
  const [methods, setMethods] = useState<Record<string, Method>>({});
  const [done, setDone] = useState<Record<number, Submission>>({});

  useEffect(() => {
    if (!user) return;
    api.get<Subject[]>('/subjects').then((s) => setSubjects(Object.fromEntries(s.map((x) => [x.id, x]))));
    api.get<Method[]>('/meta/methods').then((m) => setMethods(Object.fromEntries(m.map((x) => [x.id, x]))));
    api.get<Assignment[]>(`/assignments?student_id=${user.id}`).then(setItems);
    api.get<Submission[]>(`/submissions?student_id=${user.id}`).then((subs) => {
      const map: Record<number, Submission> = {};
      for (const s of subs) if (!map[s.assignment_id]) map[s.assignment_id] = s;
      setDone(map);
    });
  }, [user]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-5">Vazifalar</h1>
      <div className="space-y-3">
        {items.map((a) => {
          const subj = subjects[a.subject_id];
          const method = methods[a.method];
          const sub = done[a.id];
          return (
            <Card key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {subj && <span className="text-lg">{subj.icon}</span>}
                  <span className="font-medium">{a.title}</span>
                  {subj && <Badge color="indigo">{subj.name}</Badge>}
                  {method && <Badge color="violet">{method.icon} {method.name}</Badge>}
                </div>
                <div className="text-xs text-slate-400 mt-1">{a.questions.length} ta savol · {a.description}</div>
              </div>
              {sub?.grade ? (
                <Link to={`/student/result/${sub.id}`} className="text-sm font-medium text-green-700">
                  ✓ {sub.grade.percent}% — natija
                </Link>
              ) : (
                <Link
                  to={`/student/assignments/${a.id}`}
                  className="text-sm font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                >
                  Boshlash →
                </Link>
              )}
            </Card>
          );
        })}
        {items.length === 0 && <p className="text-slate-400 text-sm">Vazifa yo'q.</p>}
      </div>
    </div>
  );
}
