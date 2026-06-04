import { useEffect, useState } from 'react';

import { Badge, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';

interface ApiKey {
  id: number;
  key: string;
  label: string;
  scopes: string[];
  active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const ALL_SCOPES = ['read:subjects', 'read:analytics'];

export default function ApiKeys() {
  const [items, setItems] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState('');
  const [scopes, setScopes] = useState<string[]>([...ALL_SCOPES]);
  const [revealed, setRevealed] = useState<string | null>(null);

  const load = () => api.get<ApiKey[]>('/admin/api-keys').then(setItems);
  useEffect(() => { load(); }, []);

  const create = async () => {
    const k = await api.post<ApiKey>('/admin/api-keys', { label, scopes });
    setRevealed(k.key);
    setLabel('');
    load();
  };

  const revoke = async (id: number) => {
    await api.del(`/admin/api-keys/${id}`);
    load();
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">API kalitlar</h1>
      <p className="text-slate-500 mb-5">Tashqi tizimlar uchun integratsiya kalitlari (X-API-Key sarlavhasi bilan).</p>

      <Card className="p-4 mb-5">
        <h2 className="font-semibold text-sm mb-3">Yangi kalit yaratish</h2>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Kalit nomi (masalan, Mobil ilova)"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2" />
        <div className="flex flex-wrap gap-2 mb-3">
          {ALL_SCOPES.map((s) => (
            <button key={s} onClick={() => setScopes((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])}
              className={`text-xs px-3 py-1 rounded-full border ${scopes.includes(s) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300'}`}>
              {s}
            </button>
          ))}
        </div>
        <Button onClick={create} disabled={!label}>Yaratish</Button>
      </Card>

      {revealed && (
        <Card className="p-4 mb-5 border-green-300 bg-green-50">
          <div className="text-sm font-medium text-green-800 mb-1">✓ Kalit yaratildi (faqat hozir to'liq ko'rsatiladi):</div>
          <code className="block bg-white border border-green-200 rounded p-2 text-xs break-all">{revealed}</code>
          <div className="text-xs text-slate-500 mt-2">Sinab ko'rish:</div>
          <code className="block bg-slate-900 text-slate-100 rounded p-2 text-xs mt-1 break-all">
            curl http://localhost:8002/api/v1/subjects -H "X-API-Key: {revealed}"
          </code>
        </Card>
      )}

      <div className="space-y-2">
        {items.map((k) => (
          <Card key={k.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{k.label}</div>
              <code className="text-xs text-slate-400">{k.key}</code>
              <div className="flex gap-1 mt-1">{k.scopes.map((s) => <Badge key={s} color="blue">{s}</Badge>)}</div>
            </div>
            <div className="flex items-center gap-2">
              {k.active ? <Badge color="green">faol</Badge> : <Badge color="red">bekor</Badge>}
              {k.active && <button onClick={() => revoke(k.id)} className="text-xs text-red-500">bekor qilish</button>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
