import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, BookOpen, Layers, ClipboardList, BarChart3, MessageSquare, User, CalendarDays,
  CalendarCheck, Wallet, TrendingUp, Shield, Building2, Users, KeySquare, Megaphone,
  PenLine, FolderKanban, Menu, Moon, Sun, LogOut, Bell, GraduationCap, BookMarked, PieChart, Gauge,
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import type { Role } from '@/lib/types';

type Item = { to: string; label: string; icon: typeof Home; end?: boolean };

const NAV: Record<Role, Item[]> = {
  student: [
    { to: '/student', label: 'Bosh sahifa', icon: Home, end: true },
    { to: '/subjects', label: 'Fanlar', icon: BookOpen },
    { to: '/student/assignments', label: 'Vazifalar', icon: PenLine },
    { to: '/flashcards', label: 'Flashcards', icon: Layers },
    { to: '/tests', label: 'Testlar', icon: ClipboardList },
    { to: '/student/analytics', label: 'Natijalarim', icon: BarChart3 },
    { to: '/student/feedback', label: 'Feedback', icon: MessageSquare },
    { to: '/student/activity', label: 'Faoliyat', icon: TrendingUp },
    { to: '/student/schedule', label: 'Jadval', icon: CalendarDays },
    { to: '/student/attendance', label: 'Davomat', icon: CalendarCheck },
    { to: '/student/payments', label: "To'lovlar", icon: Wallet },
    { to: '/messages', label: 'Xabarlar', icon: MessageSquare },
    { to: '/profile', label: 'Profil', icon: User },
  ],
  teacher: [
    { to: '/teacher', label: 'Boshqaruv', icon: BarChart3, end: true },
    { to: '/teacher/statistics', label: 'Statistika', icon: PieChart },
    { to: '/teacher/content', label: "To'plamlar", icon: FolderKanban },
    { to: '/teacher/decks', label: 'Flashcards', icon: Layers },
    { to: '/teacher/tests', label: 'Testlar', icon: ClipboardList },
    { to: '/teacher/assignments', label: 'Vazifalar', icon: PenLine },
    { to: '/teacher/grading', label: 'Baholash', icon: GraduationCap },
    { to: '/ai-confidence', label: 'AI Ishonch', icon: Gauge },
    { to: '/teacher/groups', label: 'Guruhlar', icon: Users },
    { to: '/teacher/schedule', label: 'Jadval', icon: CalendarDays },
    { to: '/teacher/attendance', label: 'Davomat', icon: CalendarCheck },
    { to: '/teacher/payments', label: "To'lovlar", icon: Wallet },
    { to: '/teacher/announcements', label: "E'lonlar", icon: Megaphone },
    { to: '/messages', label: 'Xabarlar', icon: MessageSquare },
    { to: '/profile', label: 'Profil', icon: User },
  ],
  institution_admin: [
    { to: '/admin', label: 'Umumiy', icon: Shield, end: true },
    { to: '/admin/institutions', label: 'Muassasalar', icon: Building2 },
    { to: '/admin/users', label: 'Foydalanuvchilar', icon: Users },
    { to: '/admin/subjects', label: 'Fanlar', icon: BookMarked },
    { to: '/admin/api-keys', label: 'API kalitlar', icon: KeySquare },
    { to: '/ai-confidence', label: 'AI Ishonch', icon: Gauge },
    { to: '/teacher/announcements', label: "E'lonlar", icon: Megaphone },
    { to: '/profile', label: 'Profil', icon: User },
  ],
  superadmin: [
    { to: '/admin', label: 'Umumiy', icon: Shield, end: true },
    { to: '/admin/institutions', label: 'Muassasalar', icon: Building2 },
    { to: '/admin/users', label: 'Foydalanuvchilar', icon: Users },
    { to: '/admin/subjects', label: 'Fanlar', icon: BookMarked },
    { to: '/admin/api-keys', label: 'API kalitlar', icon: KeySquare },
    { to: '/ai-confidence', label: 'AI Ishonch', icon: Gauge },
    { to: '/teacher/announcements', label: "E'lonlar", icon: Megaphone },
    { to: '/profile', label: 'Profil', icon: User },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  institution_admin: 'Muassasa admini',
  superadmin: 'Superadmin',
};

export function homeFor(role: Role): string {
  return role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/admin';
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = NAV[user.role];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-fuchsia-600 grid place-items-center text-white font-bold">b</div>
          <span className="font-bold text-lg">bahol<span className="text-fuchsia-500">AI</span></span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
          <br />
          {ROLE_LABEL[user.role]}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700 px-4 flex items-center gap-2">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          {user.role === 'student' && (
            <div className="hidden md:flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm mr-2">
              <span className="font-semibold">{user.xp} XP</span>
            </div>
          )}
          <NavLink to="/notifications" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Bell size={18} /></NavLink>
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NavLink to="/profile" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600">
            <div className="w-7 h-7 rounded-full bg-primary-600 text-white grid place-items-center text-xs font-bold uppercase">{user.name[0]}</div>
            <span className="text-sm font-medium">{user.name.split(' ')[0]}</span>
          </NavLink>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Chiqish"
          >
            <LogOut size={18} />
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        {description && <p className="text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
