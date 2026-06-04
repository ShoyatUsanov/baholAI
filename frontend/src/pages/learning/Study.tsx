import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button, Card, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Flashcard } from '@/lib/types';

export default function Study() {
  const { deckId } = useParams();
  const [queue, setQueue] = useState<Flashcard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const load = () => {
    api.get<{ total: number; due: Flashcard[] }>(`/learning/decks/${deckId}/study`).then((d) => {
      setQueue(d.due);
      setTotal(d.total);
    });
  };
  useEffect(load, [deckId]);

  if (!queue) return <Spinner />;

  const card = queue[idx];
  const finished = !card;

  const rate = async (quality: number) => {
    if (!card) return;
    await api.post(`/learning/flashcards/${card.id}/review`, { quality });
    setReviewed((r) => r + 1);
    setFlipped(false);
    setIdx((i) => i + 1);
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link to="/flashcards" className="text-sm text-slate-500 hover:text-primary-600">← Flashcards</Link>
      <div className="flex items-center justify-between my-4">
        <h1 className="text-xl font-bold">O'rganish</h1>
        <span className="text-sm text-slate-500">{reviewed} / {total}</span>
      </div>

      {finished ? (
        <Card className="text-center py-12">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-lg font-semibold">Tabriklaymiz!</h2>
          <p className="text-slate-500 mt-1">Bugungi kartochkalar tugadi ({reviewed} ta).</p>
          <div className="mt-4 flex gap-2 justify-center">
            <Button variant="outline" onClick={() => { setIdx(0); setReviewed(0); load(); }}>Qayta</Button>
            <Link to="/flashcards" className="btn btn-primary">Boshqa deck</Link>
          </div>
        </Card>
      ) : (
        <>
          <Card
            onClick={() => setFlipped((f) => !f)}
            className="min-h-56 grid place-items-center text-center cursor-pointer select-none"
          >
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">{flipped ? 'Orqa' : 'Old'}</div>
              <div className="text-2xl font-semibold">{flipped ? card.back : card.front}</div>
              {flipped && card.example && <div className="text-sm text-slate-500 mt-2 italic">{card.example}</div>}
              {!flipped && <div className="text-xs text-slate-400 mt-4">javobni ko'rish uchun bosing</div>}
            </div>
          </Card>

          {flipped && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button onClick={() => rate(1)} className="btn bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200">Qiyin</button>
              <button onClick={() => rate(3)} className="btn bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200">O'rta</button>
              <button onClick={() => rate(5)} className="btn btn-accent">Oson</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
