import { useEffect, useState } from 'react';
import { Users, Plus, Clock, MapPin } from 'lucide-react';

import { Card, Button, Badge, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Group, User } from '@/lib/types';

const DAYS = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: '',
    level: '',
    days: [] as number[],
    start_time: '',
    end_time: '',
    room: '',
    monthly_fee: 0,
    member_ids: [] as number[],
  });

  const load = () => {
    if (!user) return;
    api.get<Group[]>(`/ops/groups?teacher_id=${user.id}`).then(setGroups);
  };

  useEffect(() => {
    api.get<User[]>('/users?role=student').then(setStudents);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));

  const toggleDay = (d: number) =>
    setForm((f) => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort((a, b) => a - b),
    }));

  const toggleMember = (id: number) =>
    setForm((f) => ({
      ...f,
      member_ids: f.member_ids.includes(id) ? f.member_ids.filter((x) => x !== id) : [...f.member_ids, id],
    }));

  const create = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.post('/ops/groups', {
        name: form.name,
        subject_id: user?.subject_id ?? null,
        level: form.level || null,
        member_ids: form.member_ids,
        days: form.days,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        room: form.room || null,
        monthly_fee: Number(form.monthly_fee) || 0,
      });
      setForm({ name: '', level: '', days: [], start_time: '', end_time: '', room: '', monthly_fee: 0, member_ids: [] });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (groups === null) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Guruhlar" description="O'quv guruhlarini yarating va boshqaring" />

      <Card className="p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Plus size={16} /> Yangi guruh
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Guruh nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Daraja (ixtiyoriy)" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Dars kunlari</label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const day = i + 1;
              const on = form.days.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${
                    on
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input type="time" className="input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          <input type="time" className="input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          <input className="input" placeholder="Xona" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          <input
            type="number"
            className="input"
            placeholder="Oylik to'lov"
            value={form.monthly_fee}
            onChange={(e) => setForm({ ...form, monthly_fee: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">A'zolar ({form.member_ids.length})</label>
          {students.length === 0 ? (
            <p className="text-xs text-slate-400">O'quvchi topilmadi</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {students.map((s) => {
                const on = form.member_ids.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleMember(s.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${
                      on
                        ? 'bg-accent-600 text-white border-accent-600'
                        : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button onClick={create} disabled={busy || !form.name}>
          {busy ? 'Saqlanmoqda…' : 'Guruh yaratish'}
        </Button>
      </Card>

      {groups.length === 0 ? (
        <Empty>Hali guruh yo'q</Empty>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <Card key={g.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/40 grid place-items-center text-primary-600">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{g.name}</h3>
                    <p className="text-xs text-slate-400">{g.member_ids.length} a'zo</p>
                  </div>
                </div>
                {g.level && <Badge color="primary">{g.level}</Badge>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {g.days.length > 0 && <span>{g.days.map((d) => DAYS[d - 1]).join(', ')}</span>}
                {(g.start_time || g.end_time) && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {g.start_time}–{g.end_time}
                  </span>
                )}
                {g.room && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {g.room}
                  </span>
                )}
                {g.monthly_fee > 0 && <span>{g.monthly_fee.toLocaleString()} so'm/oy</span>}
              </div>
              {g.member_ids.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {g.member_ids.map((id) => (
                    <span key={id} className="text-xs bg-slate-100 dark:bg-slate-700 rounded px-2 py-0.5">
                      {studentMap[id]?.name ?? `#${id}`}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
