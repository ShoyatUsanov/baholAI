import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

import { Card, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { Deck, Subject } from '@/lib/types';

export default function Flashcards() {
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [subjects, setSubjects] = useState<Record<number, Subject>>({});
  useEffect(() => {
    api.get<Subject[]>('/subjects').then((s) => setSubjects(Object.fromEntries(s.map((x) => [x.id, x]))));
    api.get<Deck[]>('/learning/decks').then(setDecks);
  }, []);
  if (!decks) return <Spinner />;

  return (
    <div>
      <PageHeader title="Flashcards" description="Kartochkalar bilan yodlash (spaced repetition)" />
      {decks.length === 0 ? <Empty>Deck yo'q</Empty> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((d) => {
            const subj = subjects[d.subject_id];
            return (
              <Link key={d.id} to={`/flashcards/${d.id}/study`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white grid place-items-center"><Layers size={20} /></div>
                    <div>
                      <h3 className="font-semibold text-sm">{d.title}</h3>
                      {subj && <p className="text-xs text-slate-500">{subj.icon} {subj.name}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{d.card_count} karta · o'rganishni boshlash →</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
