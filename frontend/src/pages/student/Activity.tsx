import { useEffect, useState } from 'react';
import { Trophy, ClipboardList, Layers, PenLine, BookOpen, Activity as ActivityIcon } from 'lucide-react';

import { Card, Spinner, Empty, Badge } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { ActivityItem } from '@/lib/types';

const ICONS: Record<string, typeof ActivityIcon> = {
  test: ClipboardList,
  flashcard: Layers,
  assignment: PenLine,
  lesson: BookOpen,
  achievement: Trophy,
};

export default function Activity() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  useEffect(() => {
    api.get<ActivityItem[]>('/ops/activity').then(setItems);
  }, []);

  if (!items) return <Spinner />;

  return (
    <div>
      <PageHeader title="Faoliyat" description="So'nggi harakatlaringiz va to'plagan XP" />
      {items.length === 0 ? (
        <Empty>Hozircha faoliyat yo'q</Empty>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const Icon = ICONS[a.type] ?? ActivityIcon;
            return (
              <Card key={a.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary-600 text-white grid place-items-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(a.created_at).toLocaleString()}
                      {a.score != null && <span> · {a.score}%</span>}
                    </p>
                  </div>
                </div>
                {a.xp > 0 && <Badge color="accent">+{a.xp} XP</Badge>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
