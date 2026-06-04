import { useEffect, useState } from 'react';
import { ClipboardList, Clock, Plus, Trash2 } from 'lucide-react';

import { Card, Button, Badge, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { QType, Subject, Test } from '@/lib/types';

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

export default function Tests() {
  const { user } = useAuth();
  const sid = user?.subject_id ?? null;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [tests, setTests] = useState<Test[] | null>(null);

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(20);
  const [isFinal, setIsFinal] = useState(false);
  const [questions, setQuestions] = useState<Draft[]>([newQ()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!sid) return;
    api.get<Test[]>(`/learning/tests?subject_id=${sid}`).then(setTests);
  };

  useEffect(() => {
    api.get<Subject[]>('/subjects').then((s) => setSubject(s.find((x) => x.id === sid) ?? null));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  const update = (id: string, patch: Partial<Draft>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const remove = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id));

  const save = async () => {
    if (!sid) {
      setError('Sizga fan biriktirilmagan.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.post('/learning/tests', {
        subject_id: sid,
        title,
        duration_minutes: Number(duration) || 0,
        is_final: isFinal,
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
      });
      setTitle('');
      setDuration(20);
      setIsFinal(false);
      setQuestions([newQ()]);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (tests === null) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Testlar"
        description={subject ? `${subject.icon} ${subject.name}` : 'Testlar yarating va boshqaring'}
      />

      <Card className="p-4 space-y-3 mb-6">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Plus size={16} /> Yangi test
        </h2>
        <input
          className="input"
          placeholder="Test sarlavhasi"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className="input"
            placeholder="Davomiyligi (daqiqa)"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          <label className="flex items-center gap-2 text-sm px-3">
            <input type="checkbox" checked={isFinal} onChange={(e) => setIsFinal(e.target.checked)} />
            Yakuniy test
          </label>
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => {
            const ai = q.type === 'short' || q.type === 'essay';
            return (
              <div key={q.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Savol {i + 1}</span>
                  <button onClick={() => remove(q.id)} className="text-red-500 text-xs flex items-center gap-1">
                    <Trash2 size={12} /> o'chirish
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select
                    className="input"
                    value={q.type}
                    onChange={(e) => update(q.id, { type: e.target.value as QType })}
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input"
                    value={q.max_score}
                    onChange={(e) => update(q.id, { max_score: Number(e.target.value) })}
                    placeholder="ball"
                  />
                </div>
                <input
                  className="input mb-2"
                  value={q.prompt}
                  onChange={(e) => update(q.id, { prompt: e.target.value })}
                  placeholder="Savol matni"
                />
                {q.type === 'mcq' && (
                  <textarea
                    className="input mb-2"
                    rows={3}
                    value={q.options}
                    onChange={(e) => update(q.id, { options: e.target.value })}
                    placeholder="Variantlar — har birini yangi qatorga"
                  />
                )}
                <input
                  className="input"
                  value={q.answer}
                  onChange={(e) => update(q.id, { answer: e.target.value })}
                  placeholder={ai ? 'Namunaviy javob (AI shu asosida baholaydi)' : "To'g'ri javob"}
                />
                <div className="mt-1">
                  {ai ? <Badge color="violet">🤖 AI baholaydi</Badge> : <Badge color="green">avto baho</Badge>}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setQuestions((qs) => [...qs, newQ()])}
          className="text-sm text-primary-600 dark:text-primary-400"
        >
          + savol qo'shish
        </button>

        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <Button onClick={save} disabled={busy || !title || questions.length === 0}>
            {busy ? 'Saqlanmoqda…' : 'Test yaratish'}
          </Button>
        </div>
      </Card>

      {tests.length === 0 ? (
        <Empty>Hali test yo'q</Empty>
      ) : (
        <div className="space-y-2">
          {tests.map((t) => (
            <Card key={t.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-600 text-white grid place-items-center">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{t.title}</h3>
                  <p className="text-xs text-slate-500">{t.question_count} savol</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {t.is_final && <Badge color="red">Yakuniy</Badge>}
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={12} /> {t.duration_minutes} daq
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
