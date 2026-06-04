import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

const DEMO: { label: string; username: string; password: string; role: Role; icon: string }[] = [
  { label: 'Superadmin', username: 'admin', password: 'admin123', role: 'superadmin', icon: '🛡️' },
  { label: 'Muassasa admini', username: 'rector', password: 'rector123', role: 'institution_admin', icon: '🏛️' },
  { label: "O'qituvchi (Matematika)", username: 'teacher_matematika', password: 'teacher123', role: 'teacher', icon: '👩‍🏫' },
  { label: "O'quvchi", username: 'student1', password: 'student123', role: 'student', icon: '🎓' },
];

function homeFor(role: Role) {
  return role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/admin';
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doLogin = async (u: string, p: string) => {
    setBusy(true);
    setError(null);
    try {
      const user = await login(u, p);
      navigate(homeFor(user.role));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 to-indigo-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-white">
          <div className="text-4xl font-bold">
            bahol<span className="text-fuchsia-400">AI</span>
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Barcha fanlar uchun sun'iy intellektli baholash va feedback platformasi
          </p>
        </div>

        <Card className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doLogin(username, password);
            }}
            className="space-y-3"
          >
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Login"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parol"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button type="submit" disabled={busy} className="w-full">
              Kirish
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2">Demo hisoblar — bir bosishda kirish:</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.username}
                  onClick={() => doLogin(d.username, d.password)}
                  disabled={busy}
                  className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-xs text-left hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="text-base">{d.icon}</span>
                  <span className="font-medium text-slate-700">{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
