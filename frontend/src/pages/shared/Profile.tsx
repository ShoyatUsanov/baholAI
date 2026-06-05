import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, LogOut } from 'lucide-react';

import PlanBadge from '@/components/PlanBadge';
import { Card, Spinner, Stat, Button } from '@/components/ui';
import { PageHeader } from '@/components/Layout';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/billing';
import type { Role } from '@/lib/types';

const ROLE_LABEL: Record<Role, string> = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  institution_admin: 'Muassasa admini',
  superadmin: 'Superadmin',
};

export default function Profile() {
  const { user, logout } = useAuth();
  const { planCode, data } = useSubscription();
  const navigate = useNavigate();

  if (!user) return <Spinner />;
  const sub = data?.subscription;
  const showBilling = user.role === 'student' || user.role === 'teacher';

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

      {showBilling && (
        <Card className="p-5 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Obuna:</span>
              <PlanBadge code={planCode} />
            </div>
            {sub?.days_left != null && (
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarClock size={15} /> {sub.days_left} kun qoldi
              </span>
            )}
            <Link to="/billing" className="btn btn-outline ml-auto">
              {planCode === 'free' ? 'Tarifni tanlash' : "O'zgartirish"} <ArrowRight size={16} />
            </Link>
          </div>
        </Card>
      )}

      <Button variant="outline" onClick={() => { logout(); navigate('/login'); }}>
        <LogOut size={16} className="mr-1.5" />
        Chiqish
      </Button>
    </div>
  );
}
