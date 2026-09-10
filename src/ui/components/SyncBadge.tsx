import { useAppStore } from "../../store/index.ts";
import { formatClock, useLang, useT } from "../i18n/index.ts";

/**
 * "Updated 14:32" / "Offline". A stale-but-shown timetable is the normal case in this app,
 * so the header always says how old what you are reading is.
 */
export const SyncBadge = () => {
  const t = useT();
  const lang = useLang();
  const status = useAppStore((s) => s.syncStatus);
  const lastSyncAt = useAppStore((s) => s.lastSyncAt);

  const text =
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
    <span
      className={`text-xs ${
        status === "error" || status === "offline"
          ? "text-amber-600 dark:text-amber-400"
          : "text-slate-500 dark:text-slate-400"
      }`}
      data-testid="sync-badge"
    >
      {text}
    </span>
  );
};
