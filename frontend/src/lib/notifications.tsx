import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { api } from './api';
import { useAuth } from './auth';
import type { NotificationItem } from './types';

interface NotifCtx {
  items: NotificationItem[];
  unread: number;
  reload: () => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
}

const Ctx = createContext<NotifCtx>({
  items: [], unread: 0, reload: () => {}, markRead: () => {}, markAllRead: () => {},
});

const POLL_MS = 25000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const unread = items.filter((n) => !n.read).length;

  const reload = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    try {
      const res = await api.get<{ items: NotificationItem[]; unread: number }>('/notifications');
      setItems(res.items);
    } catch {
      /* network — keep current */
    }
  }, [user]);

  useEffect(() => {
    reload();
    if (!user) return;
    const t = setInterval(reload, POLL_MS);
    return () => clearInterval(t);
  }, [reload, user]);

  const markRead = useCallback((id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    api.post(`/notifications/${id}/read`).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    api.post('/notifications/read-all').catch(() => {});
  }, []);

  return <Ctx.Provider value={{ items, unread, reload, markRead, markAllRead }}>{children}</Ctx.Provider>;
}

export const useNotifications = () => useContext(Ctx);
