import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Method, QType } from '@/lib/types';

interface Draft {
  id: string;
  type: QType;
  prompt: string;
  options: string;
  answer: string;
  max_score: number;
}

const TYPES: { value: QType; label: string; ai: boolean }[] = [
  { value: 'mcq', label: 'Variantli (avto)', ai: false },
  { value: 'fill', label: "Bo'sh joy (avto)", ai: false },
  { value: 'truefalse', label: "To'g'ri/Noto'g'ri (avto)", ai: false },
  { value: 'short', label: 'Qisqa javob (🤖 AI)', ai: true },
  { value: 'essay', label: 'Insho (🤖 AI)', ai: true },
];

let counter = 1;
const newQ = (): Draft => ({ id: `q${counter++}`, type: 'mcq', prompt: '', options: '', answer: '', max_score: 2 });

export default function CreateAssignment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState('standard');
  const [methods, setMethods] = useState<Method[]>([]);
  const [questions, setQuestions] = useState<Draft[]>([newQ()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Method[]>('/meta/methods').then(setMethods);
  }, []);

  const update = (id: string, patch: Partial<Draft>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const remove = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id));

  const save = async () => {
    if (!user?.subject_id) {
      setError("Sizga fan biriktirilmagan.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        subject_id: user.subject_id,
        title,
        description,
        method,
        questions: questions.map((q) => {
          const ai = q.type === 'short' || q.type === 'essay';
          return {
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            max_score: Number(q.max_score) || 1,
            ai_graded: ai,
            options: q.type === 'mcq' ? q.options.split('\n').map((s) => s.trim()).filter(Boolean) : undefined,
            answer: q.answer,
          };
        }),
      };
      await api.post('/assignments', payload);
      navigate('/teacher/assignments');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-5">Yangi vazifa</h1>

      <Card className="p-4 space-y-3 mb-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Vazifa sarlavhasi"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tavsif (ixtiyoriy)"
          rows={2}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <div>
          <label className="text-xs text-slate-500 block mb-1">Interaktiv usul</label>
          <div className="flex flex-wrap gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                title={m.description}
                className={`text-xs px-3 py-1.5 rounded-lg border ${
                  method === m.id ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                {m.icon} {m.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {questions.map((q, i) => {
          const ai = q.type === 'short' || q.type === 'essay';
          return (
            <Card key={q.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">Savol {i + 1}</span>
                <button onClick={() => remove(q.id)} className="text-red-500 text-xs">o'chirish</button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select
                  value={q.type}
                  onChange={(e) => update(q.id, { type: e.target.value as QType })}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={q.max_score}
                  onChange={(e) => update(q.id, { max_score: Number(e.target.value) })}
                  placeholder="ball"
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <input
                value={q.prompt}
                onChange={(e) => update(q.id, { prompt: e.target.value })}
                placeholder="Savol matni"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2"
              />
              {q.type === 'mcq' && (
                <textarea
                  value={q.options}
                  onChange={(e) => update(q.id, { options: e.target.value })}
                  placeholder="Variantlar — har birini yangi qatorga"
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2"
                />
              )}
              <input
                value={q.answer}
                onChange={(e) => update(q.id, { answer: e.target.value })}
                placeholder={ai ? 'Namunaviy javob (AI shu asosida baholaydi)' : "To'g'ri javob"}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="mt-1">{ai ? <Badge color="violet">🤖 AI baholaydi</Badge> : <Badge color="green">avto baho</Badge>}</div>
            </Card>
          );
        })}
      </div>

      <button onClick={() => setQuestions((qs) => [...qs, newQ()])} className="mt-3 text-sm text-indigo-600">
        + savol qo'shish
      </button>

      {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
      <div className="mt-4">
        <Button onClick={save} disabled={busy || !title || questions.length === 0}>
          {busy ? 'Saqlanmoqda…' : 'Vazifani yaratish'}
        </Button>
      </div>
    </div>
  );
}
