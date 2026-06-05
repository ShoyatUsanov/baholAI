import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, GraduationCap, Megaphone, MessageSquare, Scale, Sparkles,
} from 'lucide-react';

import { useNotifications } from '@/lib/notifications';
import { timeAgo } from '@/lib/time';
import type { NotificationItem } from '@/lib/types';

const TYPE_STYLE: Record<string, { icon: typeof Bell; cls: string }> = {
  grade: { icon: GraduationCap, cls: 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300' },
  feedback: { icon: MessageSquare, cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' },
  appeal: { icon: Scale, cls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300' },
  announcement: { icon: Megaphone, cls: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-900/40 dark:text-secondary-300' },
  message: { icon: MessageSquare, cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' },
  system: { icon: Sparkles, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
};

export default function NotificationBell() {
  const { items, unread, markRead, markAllRead, reload } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onItem = (n: NotificationItem) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) reload(); }}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60"
        title="Bildirishnomalar"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-[var(--surface)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] z-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[var(--surface)] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <span className="font-semibold text-sm">Bildirishnomalar</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline">
                  <CheckCheck size={14} /> Hammasini o'qilgan
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-400 mt-2">Bildirishnoma yo'q</p>
                </div>
              ) : (
                items.map((n) => {
                  const { icon: Icon, cls } = TYPE_STYLE[n.type] ?? TYPE_STYLE.system;
                  return (
                    <button
                      key={n.id}
                      onClick={() => onItem(n)}
                      className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 ${
                        n.read ? '' : 'bg-primary-50/50 dark:bg-primary-900/10'
                      }`}
                    >
                      <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${cls}`}>
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{n.title}</span>
                        {n.body && <span className="block text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{n.body}</span>}
                        <span className="block text-[11px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</span>
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
