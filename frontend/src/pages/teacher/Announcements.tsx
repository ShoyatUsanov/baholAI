import { useEffect, useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';

import { Card, Button, Badge, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { Announcement } from '@/lib/types';

const AUDIENCES: { value: string; label: string; color: string }[] = [
  { value: 'all', label: 'Hammaga', color: 'primary' },
  { value: 'students', label: "O'quvchilar", color: 'accent' },
  { value: 'teachers', label: "O'qituvchilar", color: 'violet' },
];

const audienceMeta = (a: string) => AUDIENCES.find((x) => x.value === a) ?? { value: a, label: a, color: 'slate' };

export default function Announcements() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });

  const load = () => api.get<Announcement[]>('/ops/announcements').then(setItems);

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.post('/ops/announcements', {
        title: form.title,
        body: form.body,
        audience: form.audience,
      });
      setForm({ title: '', body: '', audience: 'all' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (items === null) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <PageHeader title="E'lonlar" description="E'lonlar yarating va ko'ring" />

      <Card className="p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Plus size={16} /> Yangi e'lon
        </h2>
        <input
          className="input"
          placeholder="Sarlavha"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="input"
          rows={3}
          placeholder="Matn"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        <div>
          <label className="text-xs text-slate-500 block mb-1">Kimga</label>
          <select className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button onClick={create} disabled={busy || !form.title || !form.body}>
          {busy ? 'Saqlanmoqda…' : "E'lon e'lon qilish"}
        </Button>
      </Card>

      {items.length === 0 ? (
        <Empty>Hali e'lon yo'q</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const meta = audienceMeta(a.audience);
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Megaphone size={16} className="text-primary-600" /> {a.title}
                  </h3>
                  <Badge color={meta.color}>{meta.label}</Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{a.body}</p>
                <div className="text-xs text-slate-400 mt-2">{new Date(a.created_at).toLocaleString()}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
