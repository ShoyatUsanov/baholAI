import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

import { Card, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Group, User } from '@/lib/types';

type Status = 'present' | 'absent' | 'late' | 'excused';

const STATUSES: { value: Status; label: string; on: string }[] = [
  { value: 'present', label: 'Keldi', on: 'bg-accent-600 text-white border-accent-600' },
  { value: 'absent', label: 'Kelmadi', on: 'bg-red-600 text-white border-red-600' },
  { value: 'late', label: 'Kechikdi', on: 'bg-amber-500 text-white border-amber-500' },
  { value: 'excused', label: 'Sababli', on: 'bg-primary-600 text-white border-primary-600' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function Attendance() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [groupId, setGroupId] = useState(0);
  const [date, setDate] = useState(today());
  const [marked, setMarked] = useState<Record<number, Status>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<User[]>('/users?role=student').then(setStudents);
    api.get<Group[]>(`/ops/groups?teacher_id=${user.id}`).then((g) => {
      setGroups(g);
      if (g.length > 0) setGroupId(g[0].id);
    });
  }, [user]);

  // reset marks when group or date changes
  useEffect(() => {
    setMarked({});
  }, [groupId, date]);

  const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
  const group = groups?.find((g) => g.id === groupId) ?? null;

  const mark = async (studentId: number, status: Status) => {
    setError(null);
    try {
      await api.post('/ops/attendance', {
        student_id: studentId,
        group_id: groupId || null,
        date,
        status,
      });
      setMarked((m) => ({ ...m, [studentId]: status }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (groups === null) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Davomat" description="O'quvchilar davomatini belgilang" />

      <Card className="p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Guruh</label>
          <select className="input" value={groupId} onChange={(e) => setGroupId(Number(e.target.value))}>
            {groups.length === 0 && <option value={0}>— guruh yo'q —</option>}
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Sana</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </Card>

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      {!group || group.member_ids.length === 0 ? (
        <Empty>Bu guruhda a'zo yo'q</Empty>
      ) : (
        <div className="space-y-2">
          {group.member_ids.map((id) => {
            const current = marked[id];
            return (
              <Card key={id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{studentMap[id]?.name ?? `#${id}`}</span>
                  {current && <Check size={14} className="text-accent-600" />}
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => mark(id, s.value)}
                      className={`text-xs px-3 py-1.5 rounded-lg border ${
                        current === s.value
                          ? s.on
                          : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
