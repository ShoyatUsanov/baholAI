import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'ai' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: '',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={`btn btn-${variant} ${SIZES[size]} ${className}`} />;
}
