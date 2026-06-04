import { useEffect, useState } from 'react';

import { Badge, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';

interface Institution {
  id: number;
  name: string;
  kind: string;
  region: string | null;
}

const KINDS = [
  { v: 'university', l: 'Universitet' },
  { v: 'college', l: 'Kollej' },
  { v: 'school', l: 'Maktab' },
  { v: 'center', l: "O'quv markazi" },
];

export default function Institutions() {
  const [items, setItems] = useState<Institution[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('university');
  const [region, setRegion] = useState('');

  const load = () => api.get<Institution[]>('/admin/institutions').then(setItems);
  useEffect(() => { load(); }, []);

  const create = async () => {
    await api.post('/admin/institutions', { name, kind, region });
    setName(''); setRegion('');
    load();
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-5">Ta'lim muassasalari</h1>

      <Card className="p-4 mb-5">
        <h2 className="font-semibold text-sm mb-3">Yangi muassasa qo'shish</h2>
        <div className="grid grid-cols-3 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nomi"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm col-span-1" />
          <select value={kind} onChange={(e) => setKind(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
          </select>
          <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Hudud"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <Button onClick={create} disabled={!name} className="mt-3">Qo'shish</Button>
      </Card>

      <div className="space-y-2">
        {items.map((i) => (
          <Card key={i.id} className="p-3 flex items-center justify-between">
            <span className="font-medium">{i.name}</span>
            <div className="flex items-center gap-2">
              <Badge color="indigo">{KINDS.find((k) => k.v === i.kind)?.l ?? i.kind}</Badge>
              {i.region && <span className="text-xs text-slate-400">{i.region}</span>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
