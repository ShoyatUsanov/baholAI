import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, GraduationCap, Loader2, Shield, User } from 'lucide-react';

import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

const REMEMBER_KEY = 'baholai_remember_user';

const DEMO = [
  { label: 'Admin', username: 'admin', password: 'admin123', icon: Shield },
  { label: "O'qituvchi", username: 'teacher_matematika', password: 'teacher123', icon: GraduationCap },
  { label: "O'quvchi", username: 'student1', password: 'student123', icon: User },
];

function homeFor(role: Role) {
  return role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/admin';
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) setUsername(saved);
  }, []);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || !password) {
      setError('Login va parolni kiriting.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await login(username.trim(), password);
      if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
      else localStorage.removeItem(REMEMBER_KEY);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirishda xatolik');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Xush kelibsiz" subtitle="Hisobingizga kiring va baholashni davom ettiring.">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-3 py-2.5">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        <label className="block">
          <span className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">Login</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username yoki email"
            autoComplete="username"
            className="input"
          />
        </label>

        <label className="block">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Parol</span>
            <button
              type="button"
              onClick={() => setError('Demo rejimida parolni tiklash mavjud emas — demo hisoblardan foydalaning.')}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              Parolni unutdingizmi?
            </button>
          </div>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label={show ? 'Parolni yashirish' : "Parolni ko'rsatish"}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          Meni eslab qol
        </label>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <>Kirish <ArrowRight size={18} /></>}
        </Button>
      </form>

      <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Demo tezkor kirish — maydonlar to'ladi:</p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.username}
              type="button"
              onClick={() => {
                setUsername(d.username);
                setPassword(d.password);
                setError(null);
              }}
              className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <d.icon size={16} className="text-primary-600 dark:text-primary-400" />
              <span className="font-medium text-slate-700 dark:text-slate-200">{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Hisobingiz yo'qmi?{' '}
        <Link to="/register" className="font-medium text-primary-600 dark:text-primary-400 hover:underline">
          Ro'yxatdan o'ting
        </Link>
      </p>
    </AuthLayout>
  );
}
