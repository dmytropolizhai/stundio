import { useEffect, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Icon, type IconName } from "./icon.tsx";
import { cn, pressable } from "../../lib/utils.ts";

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
  /**
   * When set, the pill starts as an icon-only dot and opens horizontally on tap to reveal
   * `label`/`detail`, closing the same way on a second tap. The icon and its status colour stay
   * visible either way, so the state itself is never hidden — only the freshness text is.
   */
  collapsible?: boolean;
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
  collapsible = false,
  ...props
}: SyncStatusProps) => {
  const [open, setOpen] = useState(!collapsible);
  /*
   * `collapsible` flips on and off as the sync state cycles (syncing → idle, or a retry that
   * fails → succeeds); the pill should start closed each time it re-enters the quiet, collapsible
   * state rather than freezing at whatever `open` happened to be from an earlier state where
   * collapsing wasn't offered at all.
   */
  useEffect(() => {
    if (collapsible) setOpen(false);
  }, [collapsible]);
  const { icon, className: iconClass } = STATES[state];
  const toggle = collapsible ? () => setOpen((v) => !v) : undefined;
  return (
    <div
      className={cn(
        "inline-grid h-[30px] grid-flow-col items-center rounded-pill bg-card px-3",
        "font-text text-caption text-muted shadow-hairline",
        collapsible &&
          "cursor-pointer transition-[grid-template-columns] duration-(--dur-base) ease-(--ease-standard)",
        open ? "grid-cols-[auto_1fr] gap-2" : "grid-cols-[auto_0fr] gap-0",
        className,
      )}
      aria-expanded={collapsible ? open : undefined}
      {...pressable(toggle)}
      {...props}
    >
      <Icon name={icon} size={14} className={iconClass} />
      <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
        <span className="font-bold text-fg">{label}</span>
        {detail !== undefined && <span className="tabular-nums">{detail}</span>}
        {onRetry !== undefined && state === "failed" && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRetry();
            }}
            className="cursor-pointer border-0 bg-transparent p-0 font-text text-caption font-bold text-strong underline underline-offset-2"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
};
