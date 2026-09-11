import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Icon, type IconName } from "./icon.tsx";
import { cn } from "../../lib/utils.ts";

export type EmptyStateProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  icon?: IconName;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
};

/**
 * The only centred surface in the system — everything else is a full-width stack or a grid.
 *
 * Copy rule from the DS: empty states stay flat. "Saturday is clear. Enjoy it." — no apology, no
 * cheerleading, no exclamation mark.
 */
export const EmptyState = ({
  className,
  /*
   * "coffee" made every unspecified empty/failure state look like a relaxed coffee break, which
   * is wrong for e.g. a sync error. "info" is neutral across the whole range of callers (no
   * results, nothing scheduled, an error) and does not itself claim the state is good or bad —
   * callers with a real point of view (Saturday is clear, a network failure) should still pass
   * their own icon.
   */
  icon = "info",
  title,
  body,
  action,
  ...props
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center gap-2.5 rounded-xl bg-card px-6 py-9 text-center shadow-card",
      className,
    )}
    {...props}
  >
    <span className="inline-flex size-14 items-center justify-center rounded-squircle bg-brand-tint text-brand-strong">
      <Icon name={icon} size={26} />
    </span>
    <h3 className="font-display text-title tracking-display text-strong">{title}</h3>
    {body !== undefined && <p className="max-w-[260px] font-text text-body text-muted">{body}</p>}
    {action !== undefined && <div className="mt-1.5">{action}</div>}
  </div>
);
