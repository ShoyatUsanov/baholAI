import { useEffect, useState } from 'react';

import { Card, Stat } from '@/components/ui';
import { api } from '@/lib/api';

interface Overview {
  institutions: number;
  subjects: number;
  teachers: number;
  students: number;
  assignments: number;
  submissions: number;
  avg_percent: number;
  ai_graded_by_ollama: number;
  ai_graded_by_fallback: number;
}

export default function OverviewPage() {
  const [o, setO] = useState<Overview | null>(null);
  const [ai, setAi] = useState<{ reachable: boolean; model: string } | null>(null);

  useEffect(() => {
    api.get<Overview>('/analytics/overview').then(setO);
    api.get<{ reachable: boolean; model: string }>('/ai/status').then(setAi);
  }, []);

  if (!o) return <div className="text-slate-400">Yuklanmoqda…</div>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-5">Umumiy ko'rsatkichlar</h1>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="Muassasalar" value={o.institutions} />
        <Stat label="Fanlar" value={o.subjects} />
        <Stat label="O'qituvchilar" value={o.teachers} />
        <Stat label="O'quvchilar" value={o.students} />
        <Stat label="Vazifalar" value={o.assignments} />
        <Stat label="Topshirishlar" value={o.submissions} />
        <Stat label="O'rtacha natija" value={`${o.avg_percent}%`} />
        <Stat label="AI provayder" value={ai?.reachable ? '🤖 Ollama' : '⚙️ Fallback'} hint={ai?.model} />
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">AI baholash taqsimoti</h2>
        <div className="flex gap-6 text-sm">
          <div>🤖 Ollama LLM bilan: <b>{o.ai_graded_by_ollama}</b></div>
          <div>⚙️ Fallback bilan: <b>{o.ai_graded_by_fallback}</b></div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Ollama o'rnatilsa (`ollama pull {ai?.model ?? 'llama3.1'}`), barcha ochiq javoblar local LLM bilan baholanadi.
        </p>
      </Card>
    </div>
  );
}
