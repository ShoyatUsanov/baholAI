import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { Subject } from '@/lib/types';

export default function Subjects() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  useEffect(() => { api.get<Subject[]>('/subjects').then(setSubjects); }, []);
  if (!subjects) return <Spinner />;

  return (
    <div>
      <PageHeader title="Fanlar" description="Har bir fan uchun to'plamlar, darslar, kartochkalar va testlar" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => (
          <Link key={s.id} to={`/subjects/${s.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl grid place-items-center text-2xl" style={{ background: `${s.color}22` }}>
                  {s.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.description && <p className="text-xs text-slate-500 dark:text-slate-400">{s.description}</p>}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
