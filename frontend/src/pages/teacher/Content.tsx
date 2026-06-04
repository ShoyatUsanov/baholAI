import { useEffect, useState } from 'react';
import { FolderKanban, BookOpen, Clock, Plus } from 'lucide-react';

import { Card, Button, Badge, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Collection, Lesson, Subject } from '@/lib/types';

interface CollectionDetail extends Collection {
  lessons: Lesson[];
}

export default function Content() {
  const { user } = useAuth();
  const sid = user?.subject_id ?? null;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [selected, setSelected] = useState<CollectionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [colForm, setColForm] = useState({ title: '', icon: '📘', level: '' });
  const [lessonForm, setLessonForm] = useState({ title: '', content: '', est_minutes: 15 });

  const loadCollections = () => {
    if (!sid) return;
    api.get<Collection[]>(`/learning/collections?subject_id=${sid}`).then(setCollections);
  };

  useEffect(() => {
    api.get<Subject[]>('/subjects').then((s) => setSubject(s.find((x) => x.id === sid) ?? null));
    loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  const openCollection = async (id: number) => {
    setSelected(null);
    const detail = await api.get<CollectionDetail>(`/learning/collections/${id}`);
    setSelected(detail);
  };

  const createCollection = async () => {
    if (!sid) {
      setError('Sizga fan biriktirilmagan.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.post('/learning/collections', {
        subject_id: sid,
        title: colForm.title,
        icon: colForm.icon || '📘',
        level: colForm.level || null,
      });
      setColForm({ title: '', icon: '📘', level: '' });
      loadCollections();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const addLesson = async () => {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      await api.post('/learning/lessons', {
        collection_id: selected.id,
        title: lessonForm.title,
        content: lessonForm.content,
        est_minutes: Number(lessonForm.est_minutes) || 0,
        exercises: [],
      });
      setLessonForm({ title: '', content: '', est_minutes: 15 });
      await openCollection(selected.id);
      loadCollections();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (collections === null) return <Spinner />;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="To'plamlar va darslar"
        description={subject ? `${subject.icon} ${subject.name}` : "O'quv to'plamlari va darslarini boshqaring"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Plus size={16} /> Yangi to'plam
            </h2>
            <input
              className="input"
              placeholder="To'plam sarlavhasi"
              value={colForm.title}
              onChange={(e) => setColForm({ ...colForm, title: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                placeholder="Emoji (📘)"
                value={colForm.icon}
                onChange={(e) => setColForm({ ...colForm, icon: e.target.value })}
              />
              <input
                className="input"
                placeholder="Daraja (ixtiyoriy)"
                value={colForm.level}
                onChange={(e) => setColForm({ ...colForm, level: e.target.value })}
              />
            </div>
            <Button onClick={createCollection} disabled={busy || !colForm.title}>
              {busy ? 'Saqlanmoqda…' : "To'plam yaratish"}
            </Button>
          </Card>

          {collections.length === 0 ? (
            <Empty>Hali to'plam yo'q</Empty>
          ) : (
            <div className="space-y-2">
              {collections.map((c) => (
                <Card
                  key={c.id}
                  className={`p-3 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between ${
                    selected?.id === c.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <button onClick={() => openCollection(c.id)} className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/40 grid place-items-center text-lg">
                      {c.icon || <FolderKanban size={18} />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{c.title}</div>
                      <div className="text-xs text-slate-400">{c.lesson_count ?? 0} dars</div>
                    </div>
                  </button>
                  {c.level && <Badge color="primary">{c.level}</Badge>}
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          {!selected ? (
            <Card className="p-6 text-sm text-slate-400 text-center">
              Darslarni ko'rish uchun to'plamni tanlang
            </Card>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  <span className="text-lg">{selected.icon}</span> {selected.title}
                </h2>
                {selected.description && <p className="text-sm text-slate-500 mt-1">{selected.description}</p>}
              </div>

              {selected.lessons.length === 0 ? (
                <Empty>Bu to'plamda hali dars yo'q</Empty>
              ) : (
                <div className="space-y-2">
                  {selected.lessons.map((l, i) => (
                    <Card key={l.id} className="p-3 flex items-center gap-3">
                      <span className="w-6 text-slate-400 text-sm">{i + 1}</span>
                      <BookOpen size={16} className="text-primary-600" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{l.title}</div>
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {l.est_minutes} daq
                      </span>
                    </Card>
                  ))}
                </div>
              )}

              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Plus size={16} /> Yangi dars
                </h3>
                <input
                  className="input"
                  placeholder="Dars sarlavhasi"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                />
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Dars matni"
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                />
                <input
                  type="number"
                  className="input"
                  placeholder="Davomiyligi (daqiqa)"
                  value={lessonForm.est_minutes}
                  onChange={(e) => setLessonForm({ ...lessonForm, est_minutes: Number(e.target.value) })}
                />
                <Button onClick={addLesson} disabled={busy || !lessonForm.title || !lessonForm.content}>
                  {busy ? 'Saqlanmoqda…' : "Dars qo'shish"}
                </Button>
              </Card>
            </div>
          )}
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mt-4">{error}</div>}
    </div>
  );
}
