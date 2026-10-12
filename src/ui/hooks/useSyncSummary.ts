import { useAppStore } from "@/store";
import type { SyncStatus as StoreSyncStatus } from "@/sync";
import type { SyncState } from "@/ds";
import { formatClock, useLang, useT } from "@/ui/i18n";

/**
 * The store's status vocabulary ("idle" for a settled cache) mapped onto the DS's four states
 * here rather than in the DS component, which stays domain-free.
 */
const STATE: Record<StoreSyncStatus, SyncState> = {
  idle: "synced",
  syncing: "syncing",
  offline: "offline",
  error: "failed",
};

/** The sync badge's state and text, also the Settings sync row's value. */
export const useSyncSummary = (): { status: StoreSyncStatus; state: SyncState; label: string } => {
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

  return { status, state, label };
};
