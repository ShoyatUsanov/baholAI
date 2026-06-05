import type { ComponentType, ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-14 px-4">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 grid place-items-center mx-auto mb-4">
          <Icon size={26} className="text-slate-400" />
        </div>
      )}
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
