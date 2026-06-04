import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Assignment, Method } from '@/lib/types';

export default function Assignments() {
  const { user } = useAuth();
  const [items, setItems] = useState<Assignment[]>([]);
  const [methods, setMethods] = useState<Record<string, Method>>({});

  useEffect(() => {
    if (!user) return;
    api.get<Method[]>('/meta/methods').then((m) => setMethods(Object.fromEntries(m.map((x) => [x.id, x]))));
    api.get<Assignment[]>(`/assignments?teacher_id=${user.id}`).then(setItems);
  }, [user]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Vazifalarim</h1>
        <Link to="/teacher/create" className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
          ➕ Yangi vazifa
        </Link>
      </div>
      <div className="space-y-3">
        {items.map((a) => {
          const method = methods[a.method];
          const aiCount = a.questions.filter((q) => q.ai_graded || q.type === 'short' || q.type === 'essay').length;
          return (
            <Card key={a.id} className="p-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.title}</span>
                {method && <Badge color="violet">{method.icon} {method.name}</Badge>}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {a.questions.length} savol · {aiCount > 0 ? `${aiCount} ta AI baholanadi` : 'hammasi avto'}
              </div>
            </Card>
          );
        })}
        {items.length === 0 && <p className="text-slate-400 text-sm">Hali vazifa yaratmadingiz.</p>}
      </div>
    </div>
  );
}
