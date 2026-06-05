import { useEffect, useRef, useState } from 'react';
import { Upload, Eye, EyeOff, Pencil, Check, X } from 'lucide-react';

import { useToast } from '@/components/Toast';
import { Badge, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import type { Subject, User } from '@/lib/types';

type AdminUser = User & { password?: string };

export default function Users() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'teacher' | 'student'>('teacher');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState({ name: '', username: '', password: '', subject_id: 0, level: '' });
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '', level: '', subject_id: 0 });

  const subjMap = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const load = () => api.get<AdminUser[]>(`/admin/users?role=${tab}`).then(setUsers);

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

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.upload<{ created: number; skipped: { username: string }[] }>('/admin/users/import', file);
      if (tab !== 'student') setTab('student'); else load();
      const msg = `${res.created} ta o'quvchi qo'shildi` + (res.skipped.length ? `, ${res.skipped.length} ta o'tkazildi` : '');
      res.skipped.length ? toast.info(msg) : toast.success(msg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import xatosi');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const startEdit = (u: AdminUser) => {
    setEditId(u.id);
    setEditForm({ name: u.name, username: u.username, password: u.password ?? '', level: u.level ?? '', subject_id: u.subject_id ?? 0 });
  };
  const saveEdit = async () => {
    if (editId == null) return;
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name, username: editForm.username, password: editForm.password, level: editForm.level,
      };
      if (tab === 'teacher') payload.subject_id = editForm.subject_id || null;
      await api.put(`/admin/users/${editId}`, payload);
      setEditId(null);
      load();
      toast.success('Saqlandi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saqlanmadi');
    }
  };

  return (
    <div className="max-w-3xl">
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImport} className="hidden" />
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setReveal((r) => !r)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600">
            {reveal ? <EyeOff size={14} /> : <Eye size={14} />} {reveal ? 'Parollarni yashirish' : "Parollarni ko'rsatish"}
          </button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Excel'dan import
          </Button>
        </div>
      </div>

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
          <span className="text-xs font-normal text-slate-400 ml-2">yoki Excel'dan import (ustunlar: ism, login, parol, daraja)</span>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="F.I.Sh"
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm" />
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Login"
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm" />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Parol"
            className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm" />
          {tab === 'teacher' ? (
            <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: Number(e.target.value) })}
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm">
              <option value={0}>— fan tanlang —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          ) : (
            <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Daraja (masalan, Bachelor 1)"
              className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm" />
          )}
        </div>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        <Button onClick={create} disabled={!form.name || !form.username || !form.password} className="mt-3">
          Qo'shish
        </Button>
      </Card>

      <div className="space-y-2">
        {users.map((u) => (
          editId === u.id ? (
            <Card key={u.id} className="p-3 border-l-4 border-l-indigo-500">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="F.I.Sh"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm" />
                <input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} placeholder="Login"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm" />
                <input value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Parol"
                  className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm" />
                {tab === 'teacher' ? (
                  <select value={editForm.subject_id} onChange={(e) => setEditForm({ ...editForm, subject_id: Number(e.target.value) })}
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm">
                    <option value={0}>— fan —</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                  </select>
                ) : (
                  <input value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: e.target.value })} placeholder="Daraja"
                    className="border border-slate-300 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm" />
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEdit}><Check size={15} /> Saqlash</Button>
                <button onClick={() => setEditId(null)} className="text-sm text-slate-500 hover:underline inline-flex items-center gap-1"><X size={15} /> Bekor</button>
              </div>
            </Card>
          ) : (
            <Card key={u.id} className="p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{u.name}</span>
                <span className="text-xs text-slate-400 ml-2">@{u.username}</span>
                <span className="text-xs text-slate-400 ml-2">🔑 {reveal ? (u.password || '—') : '••••••'}</span>
              </div>
              {u.role === 'teacher' && u.subject_id ? (
                <Badge color="indigo">{subjMap[u.subject_id]?.icon} {subjMap[u.subject_id]?.name}</Badge>
              ) : (
                <span className="text-xs text-slate-400">{u.level}</span>
              )}
              <button onClick={() => startEdit(u)} className="text-slate-400 hover:text-primary-600 shrink-0" title="Tahrirlash">
                <Pencil size={15} />
              </button>
            </Card>
          )
        ))}
      </div>
    </div>
  );
}
