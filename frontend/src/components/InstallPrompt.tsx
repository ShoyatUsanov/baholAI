import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

import Logo from '@/components/Logo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'baholai_install_dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const standalone = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  if (!deferred || hidden || standalone) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-md">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[var(--surface)] shadow-xl px-4 py-3">
        <Logo size="sm" showText={false} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">baholAI'ni o'rnatish</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Tezkor kirish uchun ilovani qurilmangizga qo'shing.</div>
        </div>
        <button onClick={install} className="btn btn-primary text-sm whitespace-nowrap">
          <Download size={16} /> O'rnatish
        </button>
        <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0" aria-label="Yopish">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
