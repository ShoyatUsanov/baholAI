import { useEffect, useState } from 'react';

import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import type { Subject } from '@/lib/types';

const ICONS = ['📘', '📗', '➗', '🔭', '📖', '🏛️', '💻', '⚗️', '🧬', '🌍', '🎨', '🎵'];

export default function Subjects() {
  const [items, setItems] = useState<Subject[]>([]);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📘');

  const load = () => api.get<Subject[]>('/subjects').then(setItems);
  useEffect(() => { load(); }, []);

  const create = async () => {
    await api.post('/subjects', { name, icon });
    setName('');
    load();
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Fanlar</h1>
      <p className="text-slate-500 mb-5">Har bir fan bir xil imkoniyatlarga ega — vazifa, AI baholash, feedback, analitika.</p>

      <Card className="p-4 mb-5">
        <h2 className="font-semibold text-sm mb-3">Yangi fan qo'shish</h2>
        <div className="flex gap-2 items-center">
          <select value={icon} onChange={(e) => setIcon(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-2 text-lg">
            {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fan nomi"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          <Button onClick={create} disabled={!name}>Qo'shish</Button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {items.map((s) => (
          <Card key={s.id} className="p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <span className="font-medium">{s.name}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
