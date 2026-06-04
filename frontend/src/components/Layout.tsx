import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

const NAV: Record<Role, { to: string; label: string; icon: string }[]> = {
  student: [
    { to: '/student', label: 'Boshqaruv', icon: '📊' },
    { to: '/student/assignments', label: 'Vazifalar', icon: '📝' },
    { to: '/student/feedback', label: 'Feedback', icon: '💬' },
  ],
  teacher: [
    { to: '/teacher', label: 'Boshqaruv', icon: '📊' },
    { to: '/teacher/assignments', label: 'Vazifalarim', icon: '📝' },
    { to: '/teacher/create', label: 'Yangi vazifa', icon: '➕' },
    { to: '/teacher/grading', label: 'Baholash', icon: '✅' },
  ],
  institution_admin: [
    { to: '/admin', label: 'Umumiy', icon: '📊' },
    { to: '/admin/institutions', label: 'Muassasalar', icon: '🏛️' },
    { to: '/admin/users', label: 'Foydalanuvchilar', icon: '👥' },
    { to: '/admin/subjects', label: 'Fanlar', icon: '📚' },
    { to: '/admin/api-keys', label: 'API kalitlar', icon: '🔑' },
  ],
  superadmin: [
    { to: '/admin', label: 'Umumiy', icon: '📊' },
    { to: '/admin/institutions', label: 'Muassasalar', icon: '🏛️' },
    { to: '/admin/users', label: 'Foydalanuvchilar', icon: '👥' },
    { to: '/admin/subjects', label: 'Fanlar', icon: '📚' },
    { to: '/admin/api-keys', label: 'API kalitlar', icon: '🔑' },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  student: 'O\'quvchi',
  teacher: 'O\'qituvchi',
  institution_admin: 'Muassasa admini',
  superadmin: 'Superadmin',
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const items = NAV[user.role];

  return (
    <div className="min-h-full flex">
      <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-xl font-bold text-white">
            bahol<span className="text-fuchsia-400">AI</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">AI baholash platformasi</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === `/${user.role === 'student' ? 'student' : user.role === 'teacher' ? 'teacher' : 'admin'}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
                }`
              }
            >
              <span>{it.icon}</span>
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="text-sm font-medium text-white">{user.name}</div>
          <div className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-2 w-full text-left text-xs text-slate-400 hover:text-white"
          >
            ↩ Chiqish
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
