import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card ${onClick ? 'cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
