import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  FileText,
  Gauge,
  Languages,
  ListChecks,
  Menu,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';

import Logo from '@/components/Logo';
import { Avatar, Badge, ConfidenceBadge, PercentBar } from '@/components/ui';

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
    >
      {children}
    </div>
  );
}

const NAV_LINKS = [
  { href: '#features', label: 'Imkoniyatlar' },
  { href: '#how', label: 'Qanday ishlaydi' },
  { href: '#trust', label: 'Ishonch' },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/"><Logo size="md" /></Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/login" className="btn btn-ghost">Kirish</Link>
          <Link to="/register" className="btn btn-primary">Ro'yxatdan o'tish</Link>
        </div>

        <button className="md:hidden p-2 text-slate-700 dark:text-slate-200" onClick={() => setOpen((o) => !o)} aria-label="Menyu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-2 text-sm text-slate-600 dark:text-slate-300">
              {l.label}
            </a>
          ))}
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="btn btn-outline flex-1">Kirish</Link>
            <Link to="/register" className="btn btn-primary flex-1">Ro'yxatdan o'tish</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function MockDashboard() {
  const criteria = [
    { name: "Mazmun va to'g'rilik", pct: 90 },
    { name: 'Mantiqiy izchillik', pct: 75 },
    { name: 'Til va aniqlik', pct: 60 },
  ];
  return (
    <div className="card p-5 w-full shadow-xl shadow-primary-600/10 dark:shadow-black/40">
      <div className="flex items-center gap-3 mb-3">
        <Avatar name="Ali Valiyev" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Ali Valiyev</div>
          <div className="text-xs text-slate-400">Insho · Matematika</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">88%</div>
        </div>
      </div>
      <PercentBar percent={88} />

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <ConfidenceBadge value={86} />
        <Badge color="success">✓ Original</Badge>
        <Badge color="violet">🤖 AI taklif</Badge>
      </div>

      <div className="mt-4 space-y-2.5">
        {criteria.map((c) => (
          <div key={c.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400">{c.name}</span>
              <span className="font-medium">{c.pct}%</span>
            </div>
            <PercentBar percent={c.pct} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <UserCheck size={15} /> O'qituvchi tasdig'ini kutmoqda
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* dekorativ gradient bloblar + grid */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute top-10 right-0 w-96 h-96 rounded-full bg-secondary-500/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800">
            <Sparkles size={13} /> Mahalliy AI · O'zbekcha · Qonunchilikka mos
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight">
            <span className="text-brand-gradient">O'qituvchi nazoratidagi</span>
            <br />
            AI baholash platformasi
          </h1>
          <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-xl">
            baholAI ochiq javoblarni soniyalarda baholaydi, har ballni rubrika va dalil bilan
            izohlaydi va o'zbekcha feedback beradi. Yakuniy qaror — har doim o'qituvchida.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/register" className="btn btn-primary px-6 py-3 text-base">
              Bepul boshlash <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-ghost px-6 py-3 text-base">
              Demo ko'rish
            </Link>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={14} className="text-accent-500" /> Ma'lumotlar mahalliy serverda saqlanadi
          </div>
        </Reveal>

        <Reveal delay={150} className="relative">
          {/* <img src="/hero-dashboard.png" alt="baholAI dashboard" /> joyi — hozir jonli mock */}
          <div className="absolute -inset-4 -z-10 bg-brand-gradient opacity-20 blur-2xl rounded-[2rem]" />
          <MockDashboard />
        </Reveal>
      </div>
    </section>
  );
}

const STATS = [
  { value: '211', label: 'Oliy ta\'lim muassasasi' },
  { value: '49 600+', label: 'O\'qituvchi' },
  { value: '62%', label: 'Tekshiruv vaqti tejaladi' },
  { value: 'Soniyalar', label: 'Ichida feedback' },
];

function Stats() {
  return (
    <section className="max-w-6xl mx-auto px-4 -mt-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div className="card p-5 text-center">
              <div className="text-3xl font-extrabold text-brand-gradient">{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Bot, title: 'AI baholash', text: 'Ochiq javoblar (insho, qisqa javob) mahalliy LLM yoki qoidaviy rejimda avtomatik baholanadi.' },
  { icon: ShieldAlert, title: 'Plagiat & AI-detektor', text: 'Guruh ichi nusxa va AI-yozilgan matn ehtimoli aniqlanadi — o\'qituvchiga signal.' },
  { icon: ListChecks, title: 'Tushuntiriladigan baholar', text: 'Har ball rubrika mezoniga bog\'lanadi, dalil va tavsiya ko\'rsatiladi. Qora quti emas.' },
  { icon: UserCheck, title: "O'qituvchi tasdig'i", text: 'AI faqat taklif beradi — baho o\'qituvchi tasdig\'idan keyin o\'quvchiga ko\'rinadi.' },
  { icon: BarChart3, title: 'Analitika & ishonch paneli', text: 'Kelishuv darajasi, confidence kalibratsiyasi va tejalgan vaqt bir panelda.' },
  { icon: Languages, title: 'O\'zbekcha feedback', text: 'Izoh va tavsiyalar tabiiy o\'zbek tilida — o\'quvchi tushunadigan qilib.' },
];

function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-4 py-20">
      <Reveal className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight">Bitta platformada hammasi</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Baholashdan tortib analitika va qonuniy shaffoflikgacha — barchasi mahalliy.
        </p>
      </Reveal>
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 80}>
            <div className="card h-full p-6 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-brand-gradient grid place-items-center text-white shadow-sm">
                <f.icon size={22} />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { icon: FileText, title: "O'qituvchi rubrika tuzadi", text: 'Mezonlar va ballar belgilanadi.' },
  { icon: Send, title: 'O\'quvchi topshiradi', text: 'Insho yoki ochiq javob yuboriladi.' },
  { icon: Bot, title: 'AI bosqichma-bosqich baholaydi', text: 'Mezon, original\'lik, confidence.' },
  { icon: CheckCircle2, title: "O'qituvchi tasdiqlaydi", text: 'O\'quvchi feedback va natijani oladi.' },
];

function HowItWorks() {
  return (
    <section id="how" className="bg-slate-50 dark:bg-slate-900/40 border-y border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">Qanday ishlaydi</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">To'rt bosqichli, inson nazoratidagi oqim.</p>
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <div className="relative card p-6 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 grid place-items-center">
                    <s.icon size={20} />
                  </div>
                  <span className="text-3xl font-extrabold text-slate-200 dark:text-slate-700">{i + 1}</span>
                </div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.text}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-3.5 text-slate-300 dark:text-slate-600" size={20} />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section id="trust" className="max-w-6xl mx-auto px-4 py-20">
      <div className="grid md:grid-cols-2 gap-5">
        <Reveal>
          <div className="card h-full p-7">
            <div className="w-12 h-12 rounded-2xl bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-300 grid place-items-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="mt-4 text-xl font-bold">Ma'lumotlar mahalliy, qonunchilikka mos</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Barcha ma'lumotlar mahalliy serverda (SQLite) saqlanadi va tashqi serverga
              yuborilmaydi. Har baholash qarori audit jurnaliga yoziladi — "Shaxsga doir
              ma'lumotlar" qonuniga mos.
            </p>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="card h-full p-7">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 grid place-items-center">
              <UserCheck size={24} />
            </div>
            <h3 className="mt-4 text-xl font-bold">AI emas, o'qituvchi qaror qiladi</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              AI faqat taklif beradi. O'quvchi bahoga e'tiroz bildira oladi, o'qituvchi esa
              har bahoni tasdiqlaydi yoki tuzatadi. Inson nazorati — markazda.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="max-w-6xl mx-auto px-4 pb-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient px-8 py-14 text-center text-white">
          <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <Gauge className="mx-auto mb-4 opacity-90" size={36} />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Bugun boshlang</h2>
          <p className="mt-3 text-white/90 max-w-xl mx-auto">
            O'qituvchi vaqtini tejang, baholashni shaffof qiling — bepul demo bilan sinab ko'ring.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link to="/register" className="btn bg-white text-primary-700 hover:bg-white/90 px-6 py-3 text-base font-semibold">
              Ro'yxatdan o'tish <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn border border-white/40 text-white hover:bg-white/10 px-6 py-3 text-base">
              Demo hisoblar
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo size="sm" />
        <nav className="flex flex-wrap items-center gap-5 text-sm text-slate-500 dark:text-slate-400">
          <a href="#features" className="hover:text-primary-600">Imkoniyatlar</a>
          <a href="#how" className="hover:text-primary-600">Qanday ishlaydi</a>
          <a href="#trust" className="hover:text-primary-600">Ishonch</a>
          <Link to="/login" className="hover:text-primary-600">Kirish</Link>
        </nav>
        <div className="text-xs text-slate-400 text-center sm:text-right">
          Andijon hackathon 2026 · Smart Edu
          <br />© 2026 baholAI
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Trust />
      <CTASection />
      <Footer />
    </div>
  );
}
