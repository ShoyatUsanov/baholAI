import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Layers, ClipboardList, Clock } from 'lucide-react';

import { Card, Spinner, Empty } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { Collection as Col, Deck, Lesson, Test } from '@/lib/types';

interface FullCollection extends Col {
  lessons: Lesson[];
  decks: Deck[];
  tests: Test[];
}

export default function Collection() {
  const { id } = useParams();
  const [c, setC] = useState<FullCollection | null>(null);
  useEffect(() => { api.get<FullCollection>(`/learning/collections/${id}`).then(setC); }, [id]);
  if (!c) return <Spinner />;

  return (
    <div>
      <Link to={`/subjects/${c.subject_id}`} className="text-sm text-slate-500 hover:text-primary-600">← Fan</Link>
      <PageHeader title={`${c.icon} ${c.title}`} description={c.description ?? undefined} />

      <h2 className="font-semibold flex items-center gap-2 mb-3"><BookOpen size={18} className="text-primary-600" /> Darslar</h2>
      <div className="space-y-3 mb-8">
        {c.lessons.length === 0 ? <Empty>Dars yo'q</Empty> : c.lessons.map((l, i) => (
          <Link key={l.id} to={`/lessons/${l.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-200 grid place-items-center text-sm font-bold">{i + 1}</div>
                <span className="font-medium">{l.title}</span>
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={14} /> {l.est_minutes} daq</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {c.decks.length > 0 && (
          <Card>
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Layers size={18} className="text-indigo-600" /> Kartochkalar</h3>
            {c.decks.map((d) => (
              <Link key={d.id} to={`/flashcards/${d.id}/study`} className="flex items-center justify-between py-2 hover:text-primary-600">
                <span className="text-sm">{d.title}</span><span className="text-xs text-slate-400">{d.card_count} karta →</span>
              </Link>
            ))}
          </Card>
        )}
        {c.tests.length > 0 && (
          <Card>
            <h3 className="font-semibold flex items-center gap-2 mb-3"><ClipboardList size={18} className="text-rose-600" /> Testlar</h3>
            {c.tests.map((t) => (
              <Link key={t.id} to={`/tests/${t.id}`} className="flex items-center justify-between py-2 hover:text-primary-600">
                <span className="text-sm">{t.title}</span><span className="text-xs text-slate-400">{t.question_count} savol →</span>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
