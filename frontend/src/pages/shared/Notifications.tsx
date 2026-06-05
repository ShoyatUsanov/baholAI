import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';

import { PageHeader } from '@/components/Layout';
import { Button, Card, Empty } from '@/components/ui';
import { useNotifications } from '@/lib/notifications';
import { timeAgo } from '@/lib/time';
import type { NotificationItem } from '@/lib/types';

export default function Notifications() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const open = (n: NotificationItem) => {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Bildirishnomalar"
        description="So'nggi yangilanishlar"
        actions={
          unread > 0 ? (
            <Button variant="outline" onClick={markAllRead}>
              <CheckCheck size={16} /> Hammasini o'qilgan
            </Button>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <Card className="p-10">
          <Empty>
            <Bell size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            Bildirishnoma yo'q
          </Empty>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => (
            <Card
              key={n.id}
              onClick={() => open(n)}
              className={`p-4 ${n.read ? '' : 'border-l-4 border-l-primary-500'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{n.title}</h3>
                  {n.body && <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{n.body}</p>}
                  <div className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</div>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
