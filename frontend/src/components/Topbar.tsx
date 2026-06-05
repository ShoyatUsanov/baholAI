import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search, Settings, User } from 'lucide-react';

import NotificationBell from '@/components/NotificationBell';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Topbar({ title, onMenu }: { title: string; onMenu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user) return null;

  return (
    <header className="h-16 sticky top-0 z-20 bg-[var(--surface)]/80 backdrop-blur border-b border-slate-200 dark:border-slate-700/60 px-3 sm:px-5 flex items-center gap-3">
      <button onClick={onMenu} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60" aria-label="Menyu">
        <Menu size={20} />
      </button>

      <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>

      <div className="flex-1" />

      {/* Qidiruv (ixtiyoriy) */}
      <div className="hidden md:flex items-center relative">
        <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
        <input
          placeholder="Qidirish…"
          className="w-52 pl-9 pr-3 py-2 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-primary-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-colors"
        />
      </div>

      {user.role === 'student' && (
        <span className="hidden sm:inline-flex items-center text-sm font-semibold text-amber-600 dark:text-amber-400">
          {user.xp} XP
        </span>
      )}

      {/* Bildirishnoma markazi */}
      <NotificationBell />

      {/* Avatar dropdown */}
      <div className="relative">
        <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-700/60">
          <Avatar name={user.name} size="sm" />
          <span className="hidden sm:block text-sm font-medium pr-1">{user.name.split(' ')[0]}</span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-2 w-52 z-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[var(--surface)] shadow-lg overflow-hidden py-1">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <div className="text-sm font-semibold truncate">{user.name}</div>
                <div className="text-xs text-slate-400 truncate">@{user.username}</div>
              </div>
              <DropItem icon={User} label="Profil" onClick={() => { setMenuOpen(false); navigate('/profile'); }} />
              <DropItem icon={Settings} label="Sozlamalar" onClick={() => { setMenuOpen(false); navigate('/settings'); }} />
              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
              <DropItem icon={LogOut} label="Chiqish" danger onClick={() => { logout(); navigate('/login'); }} />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function DropItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof User;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );
}
