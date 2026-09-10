import type { ReactNode } from "react";
import { EmptyState, type IconName } from "../../ds/index.ts";

/**
 * The empty/blocked states — no class picked, holiday, nothing cached. A screen that goes
 * blank reads as a bug, so every one of them says what happened and what to do about it.
 *
 * The DS keeps these flat by rule: no apology, no cheerleading, no exclamation mark.
 */
export const StateMessage = ({
  icon,
  title,
  hint,
  action,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) => (
  <div className="px-gutter py-8">
    <EmptyState
      {...(icon === undefined ? {} : { icon })}
      title={title}
      {...(hint === undefined ? {} : { body: hint })}
      {...(action === undefined ? {} : { action })}
    />
  </div>
);
