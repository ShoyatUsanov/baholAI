import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Layers, ClipboardList, PenLine, Megaphone, TrendingUp } from 'lucide-react';

import { Card, Badge } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { ActivityItem, Announcement, Subject } from '@/lib/types';

const MODULES = [
  { to: '/subjects', title: 'Fanlar', desc: 'Barcha fanlar va to\'plamlar', icon: BookOpen, color: 'bg-primary-600' },
  { to: '/student/assignments', title: 'Vazifalar', desc: 'O\'qituvchi bergan topshiriqlar', icon: PenLine, color: 'bg-accent-600' },
  { to: '/flashcards', title: 'Flashcards', desc: 'Kartochkalar bilan yodlash', icon: Layers, color: 'bg-indigo-600' },
  { to: '/tests', title: 'Testlar', desc: 'O\'zingizni sinab ko\'ring', icon: ClipboardList, color: 'bg-rose-600' },
];

export default function Home() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    api.get<Subject[]>('/subjects').then(setSubjects);
    api.get<ActivityItem[]>('/ops/activity').then(setActivity).catch(() => {});
    api.get<Announcement[]>('/ops/announcements').then(setAnnouncements).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title={`Salom, ${user?.name.split(' ')[0]}! 👋`} description="Bugun nimani o'rganamiz?" />

      <Card className="mb-6 bg-gradient-to-br from-primary-600 to-fuchsia-700 text-white border-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm opacity-80">Sizning darajangiz</div>
            <div className="text-2xl font-bold">{user?.level ?? 'O\'quvchi'}</div>
            <div className="text-sm opacity-90 mt-1">{user?.xp} XP to'plandi</div>
          </div>
          <div className="text-5xl">🎓</div>
        </div>
      </Card>

      <h2 className="text-lg font-semibold mb-3">Modullar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {MODULES.map(({ to, title, desc, icon: Icon, color }) => (
          <Link key={to} to={to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className={`${color} w-10 h-10 rounded-lg grid place-items-center text-white mb-3`}>
                <Icon size={20} />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">Fanlar</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {subjects.map((s) => (
          <Link key={s.id} to={`/subjects/${s.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3 p-4">
              <span className="text-2xl">{s.icon}</span>
              <span className="font-medium text-sm">{s.name}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp size={18} className="text-primary-600" /> So'nggi faoliyat</h3>
            <Link to="/student/activity" className="text-sm text-primary-600 hover:underline">Barchasi</Link>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">Hozircha faoliyat yo'q.</p>
          ) : (
            <ul className="space-y-2">
              {activity.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div><div className="font-medium">{a.title}</div><div className="text-xs text-slate-500 capitalize">{a.type}</div></div>
                  <Badge color="accent">+{a.xp} XP</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Megaphone size={18} className="text-primary-600" /> E'lonlar</h3>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-500">E'lonlar yo'q.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.slice(0, 3).map((a) => (
                <li key={a.id} className="pb-3 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                  <div className="font-medium">{a.title}</div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
