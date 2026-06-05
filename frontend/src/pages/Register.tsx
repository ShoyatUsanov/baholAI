import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, GraduationCap, Loader2, User } from 'lucide-react';

import AuthLayout from '@/components/AuthLayout';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

type Errors = Partial<Record<'name' | 'username' | 'email' | 'password' | 'confirm' | 'terms', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function homeFor(role: Role) {
  return role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/admin';
}

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
  const meta = [
    { label: '', color: 'bg-slate-200 dark:bg-slate-700', text: '' },
    { label: 'Zaif', color: 'bg-red-500', text: 'text-red-600' },
    { label: "O'rta", color: 'bg-amber-500', text: 'text-amber-600' },
    { label: 'Kuchli', color: 'bg-accent-500', text: 'text-accent-600' },
  ][score];
  return { score, ...meta };
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [terms, setTerms] = useState(false);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pw = strength(password);

  const validate = (): boolean => {
    const e: Errors = {};
    if (!name.trim()) e.name = "To'liq ismni kiriting.";
    if (username.trim().length < 3) e.username = "Login kamida 3 ta belgi bo'lsin.";
    if (!EMAIL_RE.test(email.trim())) e.email = "Email formati noto'g'ri.";
    if (password.length < 6) e.password = "Parol kamida 6 ta belgi bo'lsin.";
    if (confirm !== password) e.confirm = 'Parollar mos kelmadi.';
    if (!terms) e.terms = 'Shartlarga rozilik kerak.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const user = await register({ name: name.trim(), username: username.trim(), email: email.trim(), password, role });
      toast.success('Hisob yaratildi. Xush kelibsiz!');
      navigate(homeFor(user.role));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Hisob yarating" subtitle="Bir daqiqada ro'yxatdan o'ting va boshlang.">
      <form onSubmit={submit} className="space-y-4">
        {serverError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-3 py-2.5">
            <AlertCircle size={16} className="shrink-0" /> {serverError}
          </div>
        )}

        {/* Rol tanlash */}
        <div>
          <span className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">Rolingiz</span>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {([
              { v: 'student', label: "O'quvchi", icon: User },
              { v: 'teacher', label: "O'qituvchi", icon: GraduationCap },
            ] as const).map((r) => (
              <button
                key={r.v}
                type="button"
                onClick={() => setRole(r.v)}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  role === r.v
                    ? 'bg-brand-gradient text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <r.icon size={16} /> {r.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="To'liq ism" error={errors.name}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ism Familiya" className="input" />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Login" error={errors.username}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" autoComplete="username" className="input" />
          </Field>
          <Field label="Email" error={errors.email}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" autoComplete="email" className="input" />
          </Field>
        </div>

        <Field label="Parol" error={errors.password}>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Parolni ko'rsatish"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pw.color}`} style={{ width: `${(pw.score / 3) * 100}%` }} />
              </div>
              <span className={`text-xs font-medium ${pw.text}`}>{pw.label}</span>
            </div>
          )}
        </Field>

        <Field label="Parolni tasdiqlang" error={errors.confirm}>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="input"
          />
        </Field>

        <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 select-none">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            Foydalanish shartlari va maxfiylik siyosatiga roziman.
            {errors.terms && <span className="block text-xs text-red-600">{errors.terms}</span>}
          </span>
        </label>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <>Ro'yxatdan o'tish <ArrowRight size={18} /></>}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Hisobingiz bormi?{' '}
        <Link to="/login" className="font-medium text-primary-600 dark:text-primary-400 hover:underline">
          Kirish
        </Link>
      </p>
    </AuthLayout>
  );
}
