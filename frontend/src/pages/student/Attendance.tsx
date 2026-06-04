import { useEffect, useState } from 'react';

import { Card, Spinner, Empty, Badge, Stat } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AttendanceRow } from '@/lib/types';

const STATUS_COLOR: Record<string, string> = {
  present: 'accent',
  absent: 'red',
  late: 'amber',
  excused: 'slate',
};

const STATUS_LABEL: Record<string, string> = {
  present: 'Keldi',
  absent: 'Kelmadi',
  late: 'Kechikdi',
  excused: 'Sababli',
};

export default function Attendance() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AttendanceRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<AttendanceRow[]>(`/ops/attendance?student_id=${user.id}`).then(setRows);
  }, [user]);

  if (!rows) return <Spinner />;

  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <PageHeader title="Davomat" description="Darslarga qatnashishingiz tarixi" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Keldi" value={count('present')} />
        <Stat label="Kelmadi" value={count('absent')} />
        <Stat label="Kechikdi" value={count('late')} />
      </div>
      {sorted.length === 0 ? (
        <Empty>Davomat ma'lumoti yo'q</Empty>
      ) : (
        <div className="space-y-2">
          {sorted.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm">{new Date(r.date).toLocaleDateString()}</div>
                {r.note && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.note}</div>}
              </div>
              <Badge color={STATUS_COLOR[r.status] ?? 'slate'}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
