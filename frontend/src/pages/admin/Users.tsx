import { useEffect, useState } from 'react';

import { Badge, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import type { Subject, User } from '@/lib/types';

export default function Users() {
  const [tab, setTab] = useState<'teacher' | 'student'>('teacher');
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState({ name: '', username: '', password: '', subject_id: 0, level: '' });
  const [error, setError] = useState<string | null>(null);

  const subjMap = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const load = () => api.get<User[]>(`/admin/users?role=${tab}`).then(setUsers);

  useEffect(() => {
    api.get<Subject[]>('/subjects').then(setSubjects);
  }, []);
  useEffect(() => { load(); }, [tab]);

  const create = async () => {
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        role: tab, name: form.name, username: form.username, password: form.password,
      };
      if (tab === 'teacher') payload.subject_id = form.subject_id || null;
      else payload.level = form.level || null;
      await api.post('/admin/users', payload);
      setForm({ name: '', username: '', password: '', subject_id: 0, level: '' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Foydalanuvchilar</h1>

      <div className="flex gap-2 mb-4">
        {(['teacher', 'student'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm px-4 py-1.5 rounded-lg border ${tab === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300'}`}>
            {t === 'teacher' ? "O'qituvchilar" : "O'quvchilar"}
          </button>
        ))}
      </div>

      <Card className="p-4 mb-5">
        <h2 className="font-semibold text-sm mb-3">
          Yangi {tab === 'teacher' ? "o'qituvchi" : "o'quvchi"} qo'shish
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="F.I.Sh"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Login"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Parol"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          {tab === 'teacher' ? (
            <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: Number(e.target.value) })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value={0}>— fan tanlang —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          ) : (
            <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Daraja (masalan, Bachelor 1)"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          )}
        </div>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        <Button onClick={create} disabled={!form.name || !form.username || !form.password} className="mt-3">
          Qo'shish
        </Button>
      </Card>

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id} className="p-3 flex items-center justify-between">
            <div>
              <span className="font-medium">{u.name}</span>
              <span className="text-xs text-slate-400 ml-2">@{u.username}</span>
            </div>
            {u.role === 'teacher' && u.subject_id ? (
              <Badge color="indigo">{subjMap[u.subject_id]?.icon} {subjMap[u.subject_id]?.name}</Badge>
            ) : (
              <span className="text-xs text-slate-400">{u.level}</span>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
