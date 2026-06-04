import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';

import { Card, Spinner, Empty, Button } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Message, User } from '@/lib/types';

export default function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [users, setUsers] = useState<Record<number, User>>({});
  const [active, setActive] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [newTo, setNewTo] = useState('');

  const load = () => {
    api.get<Message[]>('/ops/messages').then(setMessages);
  };

  useEffect(() => {
    api.get<User[]>('/users?role=student').then((u) => setUsers(Object.fromEntries(u.map((x) => [x.id, x]))));
    load();
  }, []);

  // Conversation partner ids (the other user in each message).
  const partnerIds = useMemo(() => {
    if (!messages || !user) return [];
    const ids = new Set<number>();
    for (const m of messages) {
      ids.add(m.from_id === user.id ? m.to_id : m.from_id);
    }
    return [...ids];
  }, [messages, user]);

  const thread = useMemo(() => {
    if (!messages || !user || active == null) return [];
    return messages
      .filter(
        (m) =>
          (m.from_id === user.id && m.to_id === active) ||
          (m.from_id === active && m.to_id === user.id),
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [messages, user, active]);

  // Mark unread incoming messages read when a conversation is opened.
  useEffect(() => {
    if (!user || active == null) return;
    const unread = thread.filter((m) => m.to_id === user.id && !m.read);
    if (unread.length === 0) return;
    Promise.all(unread.map((m) => api.post(`/ops/messages/${m.id}/read`))).then(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!messages || !user) return <Spinner />;

  const nameOf = (id: number) => users[id]?.name ?? `#${id}`;

  const send = async () => {
    const to = active;
    if (to == null || !draft.trim()) return;
    await api.post<Message>('/ops/messages', { to_id: to, body: draft.trim() });
    setDraft('');
    load();
  };

  const startNew = () => {
    const id = Number(newTo);
    if (!id) return;
    setActive(id);
    setNewTo('');
  };

  return (
    <div>
      <PageHeader title="Xabarlar" description="Suhbatlaringiz" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-3 md:col-span-1 h-fit">
          <div className="mb-3">
            <label className="text-xs text-slate-500 dark:text-slate-400">Yangi suhbat</label>
            <div className="flex gap-2 mt-1">
              <select className="input flex-1" value={newTo} onChange={(e) => setNewTo(e.target.value)}>
                <option value="">Tanlang…</option>
                {Object.values(users)
                  .filter((u) => u.id !== user.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
              <Button variant="outline" onClick={startNew}>
                Ochish
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            {partnerIds.length === 0 ? (
              <Empty>Suhbat yo'q</Empty>
            ) : (
              partnerIds.map((pid) => (
                <button
                  key={pid}
                  onClick={() => setActive(pid)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    active === pid
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {nameOf(pid)}
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4 md:col-span-2 flex flex-col min-h-[24rem]">
          {active == null ? (
            <Empty>Suhbatni tanlang</Empty>
          ) : (
            <>
              <div className="font-semibold text-sm mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                {nameOf(active)}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {thread.length === 0 ? (
                  <Empty>Hali xabar yo'q</Empty>
                ) : (
                  thread.map((m) => {
                    const mine = m.from_id === user.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                            mine
                              ? 'bg-primary-600 text-white rounded-br-sm'
                              : 'bg-slate-100 dark:bg-slate-700 rounded-bl-sm'
                          }`}
                        >
                          <div>{m.body}</div>
                          <div className={`text-[10px] mt-1 ${mine ? 'text-primary-100' : 'text-slate-400'}`}>
                            {new Date(m.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <textarea
                  className="input flex-1 resize-none"
                  rows={2}
                  placeholder="Xabar yozing…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <Button variant="primary" onClick={send} disabled={!draft.trim()}>
                  <Send size={16} />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
