import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Icon, type IconName } from "./icon.tsx";
import { cn } from "../../lib/utils.ts";

export type SyncState = "synced" | "syncing" | "offline" | "failed";

/**
 * Icon and colour per state. The text is *not* here.
 *
 * The published component hardcodes English ("Up to date", "Offline copy"). Stundio's chrome is
 * translated — LV is the source dictionary — so the caller passes `label`, and this keeps only the
 * glyph and the reserved status colour, which are the parts the DS actually specifies.
 */
const STATES: Record<SyncState, { icon: IconName; className: string }> = {
  synced: { icon: "cloud", className: "text-success" },
  syncing: { icon: "refresh-cw", className: "text-brand-strong motion-safe:animate-spin" },
  offline: { icon: "wifi-off", className: "text-offline" },
  failed: { icon: "triangle-alert", className: "text-danger" },
};

export type SyncStatusProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  state: SyncState;
  /** Translated status text, e.g. "Offline copy". */
  label: ReactNode;
  /** Freshness detail, e.g. "12 min ago". Tabular so it does not jitter as it ticks. */
  detail?: ReactNode;
  onRetry?: (() => void) | undefined;
  retryLabel?: string;
};

/**
 * The freshness pill. Every screen says where its data came from and how old it is — that honesty
 * is the DS's stated content rule for an offline-first app, not decoration.
 */
export const SyncStatus = ({
  className,
  state,
  label,
  detail,
  onRetry,
  retryLabel = "Retry",
  ...props
}: SyncStatusProps) => {
  const { icon, className: iconClass } = STATES[state];
  return (
    <div
      role="status"
      className={cn(
        "inline-flex h-[30px] items-center gap-2 rounded-pill bg-card px-3",
        "font-text text-caption text-muted shadow-hairline",
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={14} className={iconClass} />
      <span className="font-bold text-fg">{label}</span>
      {detail !== undefined && <span className="u-data">{detail}</span>}
      {onRetry !== undefined && state === "failed" && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "relative cursor-pointer border-0 bg-transparent p-0 font-text text-caption font-bold text-link",
            /* 30px pill, 44px floor: an invisible pseudo-element carries the touch target at the
               full 44px without growing the pill — the DS shape must not shift between states. */
            "before:absolute before:inset-x-0 before:top-1/2 before:h-11",
            "before:-translate-y-1/2 before:content-['']",
          )}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
};
