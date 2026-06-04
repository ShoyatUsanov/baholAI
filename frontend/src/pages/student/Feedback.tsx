import { useEffect, useState } from 'react';

import { Card } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Feedback as FB, Subject } from '@/lib/types';

export default function Feedback() {
  const { user } = useAuth();
  const [items, setItems] = useState<FB[]>([]);
  const [subjects, setSubjects] = useState<Record<number, Subject>>({});

  const load = () => {
    if (!user) return;
    api.get<FB[]>(`/feedback?student_id=${user.id}`).then(setItems);
  };

  useEffect(() => {
    api.get<Subject[]>('/subjects').then((s) => setSubjects(Object.fromEntries(s.map((x) => [x.id, x]))));
    load();
  }, [user]);

  const markSeen = async (id: number) => {
    await api.post(`/feedback/${id}/seen`);
    load();
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Feedback</h1>
      <p className="text-slate-500 mb-5">O'qituvchilaringizdan kelgan izohlar</p>

      <div className="space-y-3">
        {items.map((f) => {
          const subj = subjects[f.subject_id];
          return (
            <Card key={f.id} className={`p-4 border-l-4 ${f.seen_by_student ? 'border-l-slate-200' : 'border-l-amber-400'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {subj && <span>{subj.icon}</span>}
                  <span className="font-medium text-sm">{subj?.name ?? 'Fan'}</span>
                  <span className="text-sm">⭐ {f.rating}/5</span>
                  {!f.seen_by_student && <span className="text-xs text-amber-600">• yangi</span>}
                </div>
                {!f.seen_by_student && (
                  <button onClick={() => markSeen(f.id)} className="text-xs text-indigo-600 hover:underline">
                    o'qildi deb belgilash
                  </button>
                )}
              </div>
              <div className="text-sm text-slate-700 mt-2">{f.comment}</div>
              <div className="text-xs text-slate-400 mt-1">{new Date(f.created_at).toLocaleString()}</div>
            </Card>
          );
        })}
        {items.length === 0 && <p className="text-slate-400 text-sm">Hozircha feedback yo'q.</p>}
      </div>
    </div>
  );
}
