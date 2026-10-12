import { SyncStatus } from "@/ds";
import { useT } from "@/ui/i18n";
import { useSyncSummary } from "@/ui/hooks/useSyncSummary.ts";

/**
 * "Up to date · 14:32" / "Offline copy". A stale-but-shown timetable is the normal case in this
 * app, so the header always says how old what you are reading is — the DS makes that a content
 * rule, not a nicety.
 *
 * The badge starts collapsed to just its (already color-coded) icon and opens on tap to reveal
 * the freshness text — but only for the quiet "synced" case, where the timestamp is a courtesy,
 * not news. Syncing, offline, and failed states stay fully visible: those are the ones a student
 * actually needs to notice.
 */
type SyncBadgeProps = {
  onRetry?: () => void;
} & Omit<Parameters<typeof SyncStatus>[0], "state" | "label" | "aria-label">;

export const SyncBadge = ({ onRetry, ...props }: SyncBadgeProps) => {
  const t = useT();
  const { status, state, label } = useSyncSummary();

  return (
    <SyncStatus
      state={state}
      label={label}
      onRetry={onRetry}
      retryLabel={t("sync.refresh")}
      collapsible={status === "idle"}
      aria-label={label}
      data-testid="sync-badge"
      {...props}
    />
  );
};
