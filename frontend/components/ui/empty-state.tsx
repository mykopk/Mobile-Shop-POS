import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl bg-white py-14 text-center ${className}`}
    >
      {icon && <div className="text-ink-300">{icon}</div>}
      <p className="text-sm text-ink-500">{title}</p>
      {action}
    </div>
  );
}
