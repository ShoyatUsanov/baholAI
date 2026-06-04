import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layers, ClipboardList } from 'lucide-react';

import { Card, Badge, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { Collection, Deck, Subject, Test } from '@/lib/types';

export default function SubjectDetail() {
  const { id } = useParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [tests, setTests] = useState<Test[]>([]);

  useEffect(() => {
    api.get<Subject[]>('/subjects').then((s) => setSubject(s.find((x) => x.id === Number(id)) ?? null));
    api.get<Collection[]>(`/learning/collections?subject_id=${id}`).then(setCollections);
    api.get<Deck[]>(`/learning/decks?subject_id=${id}`).then(setDecks);
    api.get<Test[]>(`/learning/tests?subject_id=${id}`).then(setTests);
  }, [id]);

  if (!subject) return <Spinner />;

  return (
    <div>
      <Link to="/subjects" className="text-sm text-slate-500 hover:text-primary-600">← Fanlar</Link>
      <PageHeader title={`${subject.icon} ${subject.name}`} description="To'plamlar (to'plam ichida darslar va mashqlar)" />

      <h2 className="font-semibold mb-3">To'plamlar</h2>
      {collections.length === 0 ? <Empty>To'plam yo'q</Empty> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {collections.map((c) => (
            <Link key={c.id} to={`/collections/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.icon}</span>
                    <div>
                      <h3 className="font-semibold">{c.title}</h3>
                      <p className="text-xs text-slate-500">{c.lesson_count} dars</p>
                    </div>
                  </div>
                  {c.level && <Badge color="primary">{c.level}</Badge>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Layers size={18} className="text-indigo-600" /> Kartochkalar</h3>
          {decks.length === 0 ? <Empty>Deck yo'q</Empty> : decks.map((d) => (
            <Link key={d.id} to={`/flashcards/${d.id}/study`} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:text-primary-600">
              <span className="text-sm">{d.title}</span><span className="text-xs text-slate-400">{d.card_count} karta</span>
            </Link>
          ))}
        </Card>
        <Card>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><ClipboardList size={18} className="text-rose-600" /> Testlar</h3>
          {tests.length === 0 ? <Empty>Test yo'q</Empty> : tests.map((t) => (
            <Link key={t.id} to={`/tests/${t.id}`} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:text-primary-600">
              <span className="text-sm">{t.title}</span><span className="text-xs text-slate-400">{t.question_count} savol</span>
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
