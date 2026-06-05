import { Moon, Sun } from 'lucide-react';

import { PageHeader } from '@/components/Layout';
import { Avatar, Badge, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

const ROLE_LABEL: Record<string, string> = {
  student: "O'quvchi",
  teacher: "O'qituvchi",
  institution_admin: 'Muassasa admini',
  superadmin: 'Superadmin',
};

export default function Settings() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Sozlamalar" description="Hisob va ko'rinish sozlamalari" />

      <Card className="p-5 mb-5">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size="lg" />
          <div className="flex-1">
            <div className="font-semibold">{user.name}</div>
            <div className="text-sm text-slate-400">@{user.username}</div>
          </div>
          <Badge color="primary">{ROLE_LABEL[user.role] ?? user.role}</Badge>
        </div>
      </Card>

      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Ko'rinish</div>
            <div className="text-sm text-slate-400">Yorug' yoki tungi rejim</div>
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-sm"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? "Yorug' rejim" : 'Tungi rejim'}
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="font-medium mb-1">Boshqa sozlamalar</div>
        <p className="text-sm text-slate-400">Til, bildirishnoma va xavfsizlik sozlamalari tez orada qo'shiladi.</p>
      </Card>
    </div>
  );
}
