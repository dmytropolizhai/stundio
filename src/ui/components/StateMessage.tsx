import type { ReactNode } from "react";

/**
 * The empty/blocked states — no class picked, holiday, nothing cached. A screen that goes
 * blank reads as a bug, so every one of them says what happened and what to do about it.
 */
export const StateMessage = ({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
    {icon !== undefined && <div className="text-3xl opacity-60">{icon}</div>}
    <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
    {hint !== undefined && <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
    {action}
  </div>
);
