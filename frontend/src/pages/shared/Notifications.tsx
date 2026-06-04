import { useEffect, useState } from 'react';

import { Card, Spinner, Empty, Button } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import type { NotificationItem } from '@/lib/types';

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  const load = () => {
    api.get<NotificationItem[]>('/ops/notifications').then(setItems);
  };

  useEffect(() => {
    load();
  }, []);

  if (!items) return <Spinner />;

  const markRead = async (id: number) => {
    await api.post(`/ops/notifications/${id}/read`);
    load();
  };

  return (
    <div>
      <PageHeader title="Bildirishnomalar" description="So'nggi yangilanishlar" />
      {items.length === 0 ? (
        <Empty>Bildirishnoma yo'q</Empty>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card
              key={n.id}
              className={`p-4 ${n.read ? '' : 'border-l-4 border-l-accent-500'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{n.title}</h3>
                  {n.body && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{n.body}</p>}
                  <div className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {!n.read && (
                  <Button variant="ghost" onClick={() => markRead(n.id)}>
                    o'qildi
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
