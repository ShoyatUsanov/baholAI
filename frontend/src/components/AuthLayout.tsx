import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

import Logo from '@/components/Logo';

const PERKS = [
  'Ochiq javoblarni soniyalarda baholaydi',
  'Har ball rubrika va dalil bilan izohlanadi',
  "Yakuniy qaror — har doim o'qituvchida",
];

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Chap panel — gradient (desktop) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-gradient text-white p-12">
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-black/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative">
          <Link to="/"><Logo size="lg" tone="light" /></Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
            O'qituvchi nazoratidagi AI baholash
          </h2>
          <p className="mt-3 text-white/80">
            Shaffof, mahalliy va o'zbekcha — baholashni tezlashtiring, qarorni o'zingizda qoldiring.
          </p>
          <ul className="mt-6 space-y-3">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-white/90">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-white/20 grid place-items-center shrink-0">
                  <Check size={13} />
                </span>
                <span className="text-sm">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/60">Andijon hackathon 2026 · Smart Edu</div>
      </aside>

      {/* O'ng panel — forma */}
      <main className="flex items-center justify-center p-6 bg-[var(--bg)]">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Link to="/"><Logo size="md" /></Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
