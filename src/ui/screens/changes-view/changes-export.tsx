/**
 * "Add these changes to my calendar": the Changes screen's shortcut to the calendar export.
 *
 * It hands the OS the `.ics` of just the changed lessons (substituted, cancelled, moved), so the
 * share sheet lets the student pick Google, Apple or any other calendar app. The full target
 * choice and the all-lessons export live in Settings → Add to calendar.
 */
import { Button } from "@/ds";
import { useCalendarExport } from "@/ui/calendar/useCalendarExport.ts";
import { useT } from "@/ui/i18n";

export const ChangesExport = () => {
  const t = useT();
  const { exportTo, status, eventCount } = useCalendarExport();
  const message =
    status === "done" || status === "offline"
      ? t("calendar.status.done", { count: eventCount })
      : status === "empty"
        ? t("calendar.status.emptyChanges")
        : status === "error"
          ? t("calendar.status.error")
          : "";

  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={status === "working"}
        onClick={() => void exportTo("ics", { changesOnly: true })}
      >
        {t("changes.exportToCalendar")}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className="px-4 text-center font-text text-caption text-muted empty:hidden"
      >
        {message}
      </p>
    </div>
  );
};
