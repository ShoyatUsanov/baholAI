import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Users, Trash2, Lock, Upload, Eye, EyeOff, Pencil, Check, X } from 'lucide-react';

import HelpBanner from '@/components/HelpBanner';
import { PageHeader } from '@/components/Layout';
import { useToast } from '@/components/Toast';
import { Avatar, Badge, Button, Card, EmptyState, Input, PercentBar } from '@/components/ui';
import { api } from '@/lib/api';
import { formatSom } from '@/lib/format';
import type { MySubscription, RosterResponse, TeacherStudent } from '@/lib/types';

const PER_MEMBER_PRICE = 12000;

export default function Students() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<RosterResponse | null>(null);
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', level: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '', level: '' });

  const load = useCallback(() => {
    api.get<RosterResponse>('/teacher/students').then(setData);
    api.get<MySubscription>('/billing/me/subscription').then(setSub);
  }, []);
  useEffect(() => { load(); }, [load]);

  const perMember = sub?.features?.per_member ?? data?.plan_code === 'per_member';
  const cap = data?.cap ?? null;
  const count = data?.count ?? 0;
  const canAdd = data?.can_add ?? true;

  const save = async () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return;
    setBusy(true);
    try {
      await api.post('/teacher/students', form);
      setForm({ name: '', username: '', password: '', level: '' });
      setAdding(false);
      load();
      toast.success("O'quvchi qo'shildi" + (perMember ? ` (+${formatSom(PER_MEMBER_PRICE)}/oy)` : ''));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Qo'shib bo'lmadi");
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const res = await api.upload<{ created: number; skipped: { username: string; reason: string }[]; total: number }>(
        '/teacher/students/import', file,
      );
      load();
      const msg = `${res.created} ta qo'shildi` + (res.skipped.length ? `, ${res.skipped.length} ta o'tkazildi` : '');
      res.skipped.length ? toast.info(msg) : toast.success(msg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import xatosi');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const startEdit = (s: TeacherStudent) => {
    setEditId(s.id);
    setEditForm({ name: s.name, username: s.username, password: s.password ?? '', level: s.level ?? '' });
  };
  const saveEdit = async () => {
    if (editId == null) return;
    setBusy(true);
    try {
      await api.put(`/teacher/students/${editId}`, editForm);
      setEditId(null);
      load();
      toast.success('Saqlandi');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saqlanmadi');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number, name: string) => {
    await api.del(`/teacher/students/${id}`);
    load();
    toast.info(`${name} ro'yxatdan chiqarildi`);
  };

  return (
    <div className="max-w-4xl">
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImport} className="hidden" />
      <PageHeader
        title="O'quvchilarim"
        description="O'z o'quvchilaringizni qo'shing, ularning natijalarini kuzating."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={!canAdd || busy}>
              <Upload size={16} /> Excel'dan import
            </Button>
            <Button onClick={() => setAdding((a) => !a)} disabled={!canAdd}>
              <UserPlus size={16} /> Qo'shish
            </Button>
          </div>
        }
      />
      <HelpBanner id="teacher-students">
        💡 <b>O'z o'quvchilaringizni</b> bittadan yoki <b>Excel/CSV'dan import</b> qilib yarating
        (ustunlar: <b>ism, login, parol, daraja</b>). Har o'quvchi bitta «o'rin»ni egallaydi —
        limitga yetganda tarifni yangilang yoki <b>Moslashuvchan</b> ({formatSom(PER_MEMBER_PRICE)}/oy) rejaga o'ting.
      </HelpBanner>

      {/* Seat usage */}
      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary-500" />
            <span className="font-semibold">{count}{cap != null ? ` / ${cap}` : ''} o'quvchi</span>
            <Badge color={data?.plan_code === 'premium' ? 'violet' : data?.plan_code === 'free' ? 'slate' : 'indigo'}>
              {sub?.plan?.name ?? data?.plan_code ?? 'Bepul'}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            {count > 0 && (
              <button onClick={() => setReveal((r) => !r)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600">
                {reveal ? <EyeOff size={14} /> : <Eye size={14} />} {reveal ? 'Parollarni yashirish' : "Parollarni ko'rsatish"}
              </button>
            )}
            <div className="text-sm text-slate-500">
              {perMember ? (
                <>Joriy: <b className="text-slate-800 dark:text-slate-100">{formatSom(PER_MEMBER_PRICE * count)}</b>/oy</>
              ) : (
                <>Oylik: <b className="text-slate-800 dark:text-slate-100">{formatSom(sub?.current_monthly_cost ?? 0)}</b></>
              )}
            </div>
          </div>
        </div>
        {cap != null && <PercentBar percent={Math.min(100, Math.round((count / cap) * 100))} />}
        {!canAdd && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <Lock size={15} /> Limit to'ldi.
            <Link to="/billing" className="font-medium text-primary-600 dark:text-primary-400 hover:underline">
              Tarifni yangilang →
            </Link>
          </div>
        )}
      </Card>

      {/* Add form */}
      {adding && canAdd && (
        <Card className="p-5 mb-5 border-l-4 border-l-primary-500">
          <div className="font-semibold mb-3">Yangi o'quvchi</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="To'liq ism" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Login (username)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input placeholder="Parol" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Input placeholder="Daraja (ixtiyoriy)" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          </div>
          {perMember && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Bu o'quvchi oylik to'lovga +{formatSom(PER_MEMBER_PRICE)} qo'shadi.</p>
          )}
          <div className="flex gap-2 mt-4">
            <Button onClick={save} disabled={busy || !form.name || !form.username || !form.password}>
              {busy ? 'Qo\'shilmoqda…' : 'Qo\'shish'}
            </Button>
            <button onClick={() => setAdding(false)} className="text-sm text-slate-500 hover:underline">Bekor</button>
          </div>
        </Card>
      )}

      {/* Roster */}
      {data && data.students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Hali o'quvchi yo'q"
          description="Birinchi o'quvchingizni qo'shing yoki Excel'dan import qiling."
          action={<Button onClick={() => setAdding(true)} disabled={!canAdd}><UserPlus size={16} /> O'quvchi qo'shish</Button>}
        />
      ) : (
        <div className="space-y-2">
          {data?.students.map((s) => (
            editId === s.id ? (
              <Card key={s.id} className="p-4 border-l-4 border-l-primary-500">
                <div className="grid sm:grid-cols-2 gap-2 mb-3">
                  <Input placeholder="Ism" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  <Input placeholder="Login" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
                  <Input placeholder="Parol" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                  <Input placeholder="Daraja" value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveEdit} disabled={busy}><Check size={15} /> Saqlash</Button>
                  <button onClick={() => setEditId(null)} className="text-sm text-slate-500 hover:underline inline-flex items-center gap-1"><X size={15} /> Bekor</button>
                </div>
              </Card>
            ) : (
              <Card key={s.id} className="p-4 flex items-center gap-3">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2">
                    <span>@{s.username}</span>
                    <span className="inline-flex items-center gap-1">🔑 {reveal ? (s.password || '—') : '••••••'}</span>
                    {s.level && <span>· {s.level}</span>}
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <span className="text-slate-500">⚡ {s.xp} XP</span>
                  <span className="text-slate-500">{s.attempts} urinish</span>
                  {s.avg_percent != null && (
                    <Badge color={s.avg_percent >= 75 ? 'green' : s.avg_percent >= 50 ? 'amber' : 'red'}>{s.avg_percent}%</Badge>
                  )}
                </div>
                <button onClick={() => startEdit(s)} className="text-slate-400 hover:text-primary-600 shrink-0" title="Tahrirlash">
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(s.id, s.name)} className="text-slate-400 hover:text-red-500 shrink-0" title="Ro'yxatdan chiqarish">
                  <Trash2 size={16} />
                </button>
              </Card>
            )
          ))}
        </div>
      )}
    </div>
  );
}
