import { useEffect, useState } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';

import { Card, Button, Badge, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Deck, Subject } from '@/lib/types';

interface CardDraft {
  id: string;
  front: string;
  back: string;
  example: string;
}

let counter = 1;
const newCard = (): CardDraft => ({ id: `c${counter++}`, front: '', back: '', example: '' });

export default function Decks() {
  const { user } = useAuth();
  const sid = user?.subject_id ?? null;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [title, setTitle] = useState('');
  const [cards, setCards] = useState<CardDraft[]>([newCard()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!sid) return;
    api.get<Deck[]>(`/learning/decks?subject_id=${sid}`).then(setDecks);
  };

  useEffect(() => {
    api.get<Subject[]>('/subjects').then((s) => setSubject(s.find((x) => x.id === sid) ?? null));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  const update = (id: string, patch: Partial<CardDraft>) =>
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => setCards((cs) => cs.filter((c) => c.id !== id));

  const save = async () => {
    if (!sid) {
      setError('Sizga fan biriktirilmagan.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.post('/learning/decks', {
        subject_id: sid,
        title,
        cards: cards
          .filter((c) => c.front.trim() && c.back.trim())
          .map((c) => ({
            front: c.front,
            back: c.back,
            example: c.example || undefined,
          })),
      });
      setTitle('');
      setCards([newCard()]);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (decks === null) return <Spinner />;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Flashcards"
        description={subject ? `${subject.icon} ${subject.name}` : 'Kartochkalar to‘plamlari'}
      />

      <Card className="p-4 mb-6 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Plus size={16} /> Yangi to'plam
        </h2>
        <input
          className="input"
          placeholder="To'plam sarlavhasi"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="space-y-2">
          {cards.map((c, i) => (
            <div key={c.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Kartochka {i + 1}</span>
                <button onClick={() => remove(c.id)} className="text-red-500 text-xs flex items-center gap-1">
                  <Trash2 size={12} /> o'chirish
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  className="input"
                  placeholder="Old tomoni"
                  value={c.front}
                  onChange={(e) => update(c.id, { front: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Orqa tomoni"
                  value={c.back}
                  onChange={(e) => update(c.id, { back: e.target.value })}
                />
              </div>
              <input
                className="input"
                placeholder="Misol (ixtiyoriy)"
                value={c.example}
                onChange={(e) => update(c.id, { example: e.target.value })}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => setCards((cs) => [...cs, newCard()])}
          className="text-sm text-primary-600 dark:text-primary-400"
        >
          + kartochka qo'shish
        </button>

        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <Button
            onClick={save}
            disabled={busy || !title || !cards.some((c) => c.front.trim() && c.back.trim())}
          >
            {busy ? 'Saqlanmoqda…' : "To'plam yaratish"}
          </Button>
        </div>
      </Card>

      {decks.length === 0 ? (
        <Empty>Hali flashcard to'plami yo'q</Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {decks.map((d) => (
            <Card key={d.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-600 text-white grid place-items-center">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{d.title}</h3>
                  {d.description && <p className="text-xs text-slate-500">{d.description}</p>}
                </div>
              </div>
              <Badge color="accent">{d.card_count ?? 0} karta</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
