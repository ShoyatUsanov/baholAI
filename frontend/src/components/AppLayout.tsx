import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Sidebar, { NAV } from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

const COLLAPSE_KEY = 'baholai_sidebar_collapsed';

export function homeFor(role: Role): string {
  return role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/admin';
}

function titleForPath(role: Role, pathname: string): string {
  let best = '';
  let bestLen = -1;
  for (const it of NAV[role] ?? []) {
    if (it.to === pathname || pathname.startsWith(`${it.to}/`)) {
      if (it.to.length > bestLen) {
        bestLen = it.to.length;
        best = it.label;
      }
    }
  }
  if (best) return best;
  if (pathname.startsWith('/profile')) return 'Profil';
  if (pathname.startsWith('/settings')) return 'Sozlamalar';
  if (pathname.startsWith('/notifications')) return 'Bildirishnomalar';
  if (pathname.startsWith('/teacher/create')) return 'Vazifa yaratish';
  return 'baholAI';
}

export default function AppLayout({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  if (!user) return null;
  const title = titleForPath(user.role, location.pathname);

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--text)]">
      {drawerOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setDrawerOpen(false)} />}

      <div
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen shrink-0 w-64 transition-all duration-200 ${
          collapsed ? 'lg:w-[76px]' : 'lg:w-64'
        } ${drawerOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} onNavigate={() => setDrawerOpen(false)} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} onMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}

export { PageHeader } from './ui';
