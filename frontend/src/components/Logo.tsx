import { useId } from 'react';

type Size = 'sm' | 'md' | 'lg';

const MARK_PX: Record<Size, number> = { sm: 28, md: 36, lg: 48 };
const TEXT_CLS: Record<Size, string> = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };
const RADIUS: Record<Size, number> = { sm: 8, md: 10, lg: 13 };

export default function Logo({ size = 'md', showText = true }: { size?: Size; showText?: boolean }) {
  const gid = useId();
  const px = MARK_PX[size];

  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg width={px} height={px} viewBox="0 0 40 40" fill="none" aria-label="baholAI">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4F46E5" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx={RADIUS[size]} fill={`url(#${gid})`} />
        <text
          x="20"
          y="20"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="800"
          fontSize="21"
          letterSpacing="-1.5"
          fill="#ffffff"
        >
          <tspan fontSize="17">b</tspan>
          <tspan fontSize="23" dx="-1.5">A</tspan>
        </text>
      </svg>

      {showText && (
        <span className={`font-extrabold tracking-tight leading-none ${TEXT_CLS[size]}`}>
          <span className="text-slate-900 dark:text-white">bahol</span>
          <span className="text-brand-gradient">AI</span>
        </span>
      )}
    </span>
  );
}
