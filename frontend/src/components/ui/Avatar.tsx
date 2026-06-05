type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function Avatar({ name, size = 'md', className = '' }: { name: string; size?: Size; className?: string }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <div
      className={`${SIZES[size]} rounded-full bg-brand-gradient text-white grid place-items-center font-bold uppercase shrink-0 shadow-sm ${className}`}
      title={name}
    >
      {initial}
    </div>
  );
}
