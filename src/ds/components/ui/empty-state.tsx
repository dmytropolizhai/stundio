import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn, Icon, type IconName } from "@/ds";

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
  icon = "coffee",
  title,
  body,
  action,
  ...props
}: EmptyStateProps) => (
  <div
    className={cn(
      "bg-card flex flex-col items-center gap-2.5 rounded-xl px-6 py-9 text-center",
      className
    )}
    {...props}
  >
    <span className="inline-flex size-14 items-center justify-center rounded-squircle text-title">
      <Icon name={icon} size={26} />
    </span>
    <h3 className="font-display text-title tracking-display text-strong">{title}</h3>
    {body !== undefined && <p className="max-w-65 font-text text-body text-muted">{body}</p>}
    {action !== undefined && <div className="mt-1.5">{action}</div>}
  </div>
);
