import { useAppStore } from "../../store/index.ts";
import type { SyncStatus as StoreSyncStatus } from "../../sync/index.ts";
import { SyncStatus, type SyncState } from "../../ds/index.ts";
import { formatClock, useLang, useT } from "../i18n/index.ts";

/**
 * "Up to date · 14:32" / "Offline copy". A stale-but-shown timetable is the normal case in this
 * app, so the header always says how old what you are reading is — the DS makes that a content
 * rule, not a nicety.
 *
 * The store's status vocabulary ("idle" for a settled cache) is mapped onto the DS's four states
 * here rather than in the DS component, which stays domain-free.
 */
const STATE: Record<StoreSyncStatus, SyncState> = {
  idle: "synced",
  syncing: "syncing",
  offline: "offline",
  error: "failed",
};

export const SyncBadge = ({ onRetry }: { onRetry?: () => void }) => {
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
      data-testid="sync-badge"
    />
  );
};
