import { useEffect, useState } from 'react';
import { Clock, MapPin } from 'lucide-react';

import { Card, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ScheduleEntry, Subject } from '@/lib/types';

const DAYS = ['', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];

export default function Schedule() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ScheduleEntry[] | null>(null);
  const [subjects, setSubjects] = useState<Record<number, Subject>>({});

  useEffect(() => {
    if (!user) return;
    api.get<Subject[]>('/subjects').then((s) => setSubjects(Object.fromEntries(s.map((x) => [x.id, x]))));
    api.get<ScheduleEntry[]>(`/ops/schedule?student_id=${user.id}`).then(setEntries);
  }, [user]);

  if (!entries) return <Spinner />;

  const byDay = new Map<number, ScheduleEntry[]>();
  for (const e of entries) {
    const list = byDay.get(e.day_of_week) ?? [];
    list.push(e);
    byDay.set(e.day_of_week, list);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  for (const d of days) {
    byDay.get(d)!.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  return (
    <div>
      <PageHeader title="Dars jadvali" description="Haftalik darslaringiz" />
      {days.length === 0 ? (
        <Empty>Jadval bo'sh</Empty>
      ) : (
        <div className="space-y-5">
          {days.map((d) => (
            <Card key={d} className="p-4">
              <h3 className="font-semibold mb-3">{DAYS[d]}</h3>
              <div className="space-y-2">
                {byDay.get(d)!.map((e) => {
                  const subj = e.subject_id != null ? subjects[e.subject_id] : undefined;
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40"
                    >
                      <div className="flex items-center gap-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 w-28 shrink-0">
                        <Clock size={14} />
                        {e.start_time}–{e.end_time}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {subj && <span className="mr-1">{subj.icon}</span>}
                          {e.title}
                        </div>
                        {e.room && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} /> {e.room}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
