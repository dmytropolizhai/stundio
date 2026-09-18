import { useAppStore } from "@/store";
import type { SyncStatus as StoreSyncStatus } from "@/sync";
import { SyncStatus, type SyncState } from "@/ds";
import { formatClock, useLang, useT } from "@/ui/i18n";

/**
 * "Up to date · 14:32" / "Offline copy". A stale-but-shown timetable is the normal case in this
 * app, so the header always says how old what you are reading is — the DS makes that a content
 * rule, not a nicety.
 *
 * The store's status vocabulary ("idle" for a settled cache) is mapped onto the DS's four states
 * here rather than in the DS component, which stays domain-free.
 *
 * The badge starts collapsed to just its (already color-coded) icon and opens on tap to reveal
 * the freshness text — but only for the quiet "synced" case, where the timestamp is a courtesy,
 * not news. Syncing, offline, and failed states stay fully visible: those are the ones a student
 * actually needs to notice.
 */
const STATE: Record<StoreSyncStatus, SyncState> = {
  idle: "synced",
  syncing: "syncing",
  offline: "offline",
  error: "failed",
};

type SyncBadgeProps = {
  onRetry?: () => void;
} & Omit<Parameters<typeof SyncStatus>[0], "state" | "label" | "aria-label">;

export const SyncBadge = ({ onRetry, ...props }: SyncBadgeProps) => {
  const t = useT();
  const lang = useLang();
  const status = useAppStore((s) => s.syncStatus);
  const lastSyncAt = useAppStore((s) => s.lastSyncAt);

  const state = STATE[status];
  const label =
    status === "syncing"
      ? t("sync.syncing")
      : status === "offline"
        ? t("sync.offline")
        : status === "error"
          ? t("sync.error")
          : lastSyncAt === null
            ? t("sync.never")
            : t("sync.updated", { time: formatClock(lastSyncAt, lang) });

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
