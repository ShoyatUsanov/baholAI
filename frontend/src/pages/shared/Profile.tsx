import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { Card, Spinner, Stat, Button } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

const ROLE_LABEL: Record<Role, string> = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  institution_admin: 'Muassasa admini',
  superadmin: 'Superadmin',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Spinner />;

  return (
    <div>
      <PageHeader title="Profil" description="Hisob ma'lumotlaringiz" />
      <Card className="p-6 flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-primary-600 text-white grid place-items-center text-3xl font-bold uppercase shrink-0">
          {user.name[0]}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold truncate">{user.name}</h2>
          <p className="text-slate-500 dark:text-slate-400">{ROLE_LABEL[user.role]}</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Stat label="Daraja" value={user.level ?? '—'} />
        <Stat label="XP" value={user.xp} />
      </div>

      <Button variant="outline" onClick={() => { logout(); navigate('/login'); }}>
        <LogOut size={16} className="mr-1.5" />
        Chiqish
      </Button>
    </div>
  );
}
