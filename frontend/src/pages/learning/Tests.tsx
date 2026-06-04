import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock } from 'lucide-react';

import { Card, Spinner, Empty, Badge } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { Subject, Test } from '@/lib/types';

export default function Tests() {
  const [tests, setTests] = useState<Test[] | null>(null);
  const [subjects, setSubjects] = useState<Record<number, Subject>>({});
  useEffect(() => {
    api.get<Subject[]>('/subjects').then((s) => setSubjects(Object.fromEntries(s.map((x) => [x.id, x]))));
    api.get<Test[]>('/learning/tests').then(setTests);
  }, []);
  if (!tests) return <Spinner />;

  return (
    <div>
      <PageHeader title="Testlar" description="O'zingizni sinab ko'ring — natija va xato tahlili bilan" />
      {tests.length === 0 ? <Empty>Test yo'q</Empty> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tests.map((t) => {
            const subj = subjects[t.subject_id];
            return (
              <Link key={t.id} to={`/tests/${t.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-600 text-white grid place-items-center"><ClipboardList size={20} /></div>
                    <div>
                      <h3 className="font-semibold text-sm">{t.title}</h3>
                      <p className="text-xs text-slate-500">{subj?.icon} {subj?.name} · {t.question_count} savol</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {t.is_final && <Badge color="red">Yakuniy</Badge>}
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12} /> {t.duration_minutes} daq</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
