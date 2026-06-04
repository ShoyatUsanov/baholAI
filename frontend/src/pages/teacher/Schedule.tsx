import { useEffect, useState } from 'react';
import { CalendarDays, Plus, Clock, MapPin } from 'lucide-react';

import { Card, Button, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ScheduleEntry } from '@/lib/types';

const DAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];

export default function Schedule() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ScheduleEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    title: '',
    day_of_week: 1,
    start_time: '',
    end_time: '',
    room: '',
  });

  const load = () => {
    if (!user) return;
    api.get<ScheduleEntry[]>(`/ops/schedule?teacher_id=${user.id}`).then(setEntries);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const create = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.post('/ops/schedule', {
        title: form.title,
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room || null,
        group_id: null,
      });
      setForm({ title: '', day_of_week: 1, start_time: '', end_time: '', room: '' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (entries === null) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Dars jadvali" description="Haftalik dars jadvalingizni boshqaring" />

      <Card className="p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Plus size={16} /> Yangi dars
        </h2>
        <input
          className="input"
          placeholder="Dars nomi"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className="input"
            value={form.day_of_week}
            onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}
          >
            {DAYS.map((d, i) => (
              <option key={i + 1} value={i + 1}>{d}</option>
            ))}
          </select>
          <input className="input" placeholder="Xona" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          <input type="time" className="input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          <input type="time" className="input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button onClick={create} disabled={busy || !form.title || !form.start_time || !form.end_time}>
          {busy ? 'Saqlanmoqda…' : "Jadvalga qo'shish"}
        </Button>
      </Card>

      {entries.length === 0 ? (
        <Empty>Hali jadval yo'q</Empty>
      ) : (
        <div className="space-y-4">
          {DAYS.map((d, i) => {
            const day = i + 1;
            const dayEntries = entries
              .filter((e) => e.day_of_week === day)
              .sort((a, b) => a.start_time.localeCompare(b.start_time));
            if (dayEntries.length === 0) return null;
            return (
              <div key={day}>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <CalendarDays size={16} className="text-primary-600" /> {d}
                </h3>
                <div className="space-y-2">
                  {dayEntries.map((e) => (
                    <Card key={e.id} className="p-3 flex items-center justify-between">
                      <span className="font-medium text-sm">{e.title}</span>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {e.start_time}–{e.end_time}
                        </span>
                        {e.room && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {e.room}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
