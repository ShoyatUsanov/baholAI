import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3, BookMarked, BookOpen, Building2, CalendarCheck, CalendarDays, ChevronsLeft,
  ChevronsRight, ClipboardList, CreditCard, FolderKanban, Gauge, GraduationCap, Home, KeySquare,
  Layers, LogOut, Megaphone, MessageSquare, Moon, PenLine, PieChart, Receipt, Scale, Shield, Sun,
  Tags, TrendingUp, User, Users, Wallet,
} from 'lucide-react';

import Logo from '@/components/Logo';
import PlanBadge from '@/components/PlanBadge';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/billing';
import { useTheme } from '@/lib/theme';
import type { Role } from '@/lib/types';

type Item = { to: string; label: string; icon: typeof Home; end?: boolean };

export const NAV: Record<Role, Item[]> = {
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
    { to: '/billing', label: 'Obuna', icon: CreditCard },
    { to: '/messages', label: 'Xabarlar', icon: MessageSquare },
  ],
  teacher: [
    { to: '/teacher', label: 'Boshqaruv', icon: BarChart3, end: true },
    { to: '/teacher/statistics', label: 'Statistika', icon: PieChart },
    { to: '/teacher/grading', label: 'Baholash', icon: GraduationCap },
    { to: '/teacher/appeals', label: "E'tirozlar", icon: Scale },
    { to: '/ai-confidence', label: 'AI Ishonch', icon: Gauge },
    { to: '/teacher/assignments', label: 'Vazifalar', icon: PenLine },
    { to: '/teacher/content', label: "To'plamlar", icon: FolderKanban },
    { to: '/teacher/tests', label: 'Testlar', icon: ClipboardList },
    { to: '/teacher/groups', label: 'Guruhlar', icon: Users },
    { to: '/teacher/schedule', label: 'Jadval', icon: CalendarDays },
    { to: '/teacher/attendance', label: 'Davomat', icon: CalendarCheck },
    { to: '/teacher/payments', label: "To'lovlar", icon: Wallet },
    { to: '/billing', label: 'Obuna', icon: CreditCard },
    { to: '/teacher/announcements', label: "E'lonlar", icon: Megaphone },
    { to: '/messages', label: 'Xabarlar', icon: MessageSquare },
  ],
  institution_admin: [
    { to: '/admin', label: "Umumiy ko'rinish", icon: Shield, end: true },
    { to: '/admin/institutions', label: 'Muassasalar', icon: Building2 },
    { to: '/admin/users', label: 'Foydalanuvchilar', icon: Users },
    { to: '/admin/subjects', label: 'Fanlar', icon: BookMarked },
    { to: '/admin/api-keys', label: 'API kalitlar', icon: KeySquare },
    { to: '/admin/plans', label: 'Tariflar', icon: Tags },
    { to: '/admin/subscriptions', label: 'Obunalar', icon: Receipt },
    { to: '/ai-confidence', label: 'AI Ishonch', icon: Gauge },
    { to: '/teacher/announcements', label: "E'lonlar", icon: Megaphone },
  ],
  superadmin: [
    { to: '/admin', label: "Umumiy ko'rinish", icon: Shield, end: true },
    { to: '/admin/institutions', label: 'Muassasalar', icon: Building2 },
    { to: '/admin/users', label: 'Foydalanuvchilar', icon: Users },
    { to: '/admin/subjects', label: 'Fanlar', icon: BookMarked },
    { to: '/admin/api-keys', label: 'API kalitlar', icon: KeySquare },
    { to: '/admin/plans', label: 'Tariflar', icon: Tags },
    { to: '/admin/subscriptions', label: 'Obunalar', icon: Receipt },
    { to: '/ai-confidence', label: 'AI Ishonch', icon: Gauge },
    { to: '/teacher/announcements', label: "E'lonlar", icon: Megaphone },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  institution_admin: 'Muassasa admini',
  superadmin: 'Superadmin',
};

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { planCode } = useSubscription();
  const navigate = useNavigate();
  if (!user) return null;
  const items = NAV[user.role];
  const hide = collapsed ? 'lg:hidden' : '';

  return (
    <aside className="h-full flex flex-col bg-white dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-700/60">
      {/* Brand + collapse toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700/60">
        <NavLink to={homeForRole(user.role)} onClick={onNavigate} className={collapsed ? 'lg:hidden' : ''}>
          <Logo size="md" />
        </NavLink>
        <NavLink to={homeForRole(user.role)} onClick={onNavigate} className={collapsed ? 'hidden lg:block mx-auto' : 'hidden'}>
          <Logo size="md" showText={false} />
        </NavLink>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          title={collapsed ? 'Kengaytirish' : 'Yig\'ish'}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                collapsed ? 'lg:justify-center lg:px-0' : ''
              } ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-brand-gradient" />
                )}
                <Icon size={18} className="shrink-0" />
                <span className={hide}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + actions */}
      <div className="border-t border-slate-200 dark:border-slate-700/60 p-3 space-y-2">
        <div className={`flex items-center gap-2.5 px-1 ${collapsed ? 'lg:justify-center' : ''}`}>
          <Avatar name={user.name} size="sm" />
          <div className={`min-w-0 ${hide}`}>
            <div className="text-sm font-semibold truncate flex items-center gap-1.5">
              {user.name}
              {(user.role === 'student' || user.role === 'teacher') && <PlanBadge code={planCode} />}
            </div>
            <div className="text-xs text-primary-600 dark:text-primary-400">{ROLE_LABEL[user.role]}</div>
          </div>
        </div>

        <div className={`flex gap-1 ${collapsed ? 'lg:flex-col' : ''}`}>
          <button
            onClick={toggle}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 ${collapsed ? 'lg:justify-center lg:flex-1' : 'flex-1'}`}
            title={dark ? 'Yorug\' rejim' : 'Tungi rejim'}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
            <span className={hide}>{dark ? 'Yorug\'' : 'Tungi'}</span>
          </button>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 ${collapsed ? 'lg:justify-center lg:flex-1' : 'flex-1'}`}
            title="Chiqish"
          >
            <LogOut size={17} />
            <span className={hide}>Chiqish</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function homeForRole(role: Role): string {
  return role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/admin';
}
