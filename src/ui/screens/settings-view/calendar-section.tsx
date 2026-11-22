/**
 * Settings → Add to calendar: two rows. "Changes only" is the scope switch and sits first so the
 * student sees what an export will contain before choosing where it goes; "Add to calendar" opens
 * a sheet of targets. The row's value carries the scope while idle and the outcome after a tap, so
 * the feedback appears where the finger was; the line below it keeps the detail and the next step.
 */
import { useState } from "react";
import { BottomSheet, Icon, type IconName } from "@/ds";
import type { CalendarTarget } from "@/lib/calendar";
import { useAppStore, useSettingSetter } from "@/store";
import { useCalendarExport, type CalendarExportStatus } from "@/ui/calendar/useCalendarExport.ts";
import { useT, type MessageKey } from "@/ui/i18n";
import { Section } from "./settings-section.tsx";
import { SettingsRow, StatusDot, Tile } from "./settings-row.tsx";
import { SheetDescription, SheetTitle } from "./settings-sheet.tsx";

const TARGETS: { target: CalendarTarget; icon: IconName; label: MessageKey; hint: MessageKey }[] = [
  {
    target: "google",
    icon: "calendar-days",
    label: "settings.calendarGoogle",
    hint: "settings.calendarGoogleHint",
  },
  {
    target: "ics",
    icon: "download",
    label: "settings.calendarOther",
    hint: "settings.calendarOtherHint",
  },
  {
    target: "outlook",
    icon: "calendar-days",
    label: "settings.calendarOutlook",
    hint: "settings.calendarOutlookHint",
  },
  {
    target: "apple",
    icon: "calendar-days",
    label: "settings.calendarApple",
    hint: "settings.calendarAppleHint",
  },
];

const messageKey = (status: CalendarExportStatus, changesOnly: boolean): MessageKey | null => {
  switch (status) {
    case "working":
      return "calendar.status.working";
    case "done":
      return "calendar.status.done";
    case "offline":
      return "calendar.status.offline";
    case "empty":
      return changesOnly ? "calendar.status.emptyChanges" : "calendar.status.empty";
    case "error":
      return "calendar.status.error";
    case "idle":
      return null;
  }
};

export const CalendarSection = () => {
  const t = useT();
  const changesOnly = useAppStore((s) => s.settings.calendarChangesOnly);
  const setChangesOnly = useSettingSetter("calendarChangesOnly");
  const { exportTo, status, eventCount } = useCalendarExport();
  const [sheetOpen, setSheetOpen] = useState(false);

  const key = messageKey(status, changesOnly);
  const working = status === "working";

  const value =
    status === "working" ? (
      t("calendar.value.working")
    ) : status === "done" || status === "offline" ? (
      <>
        <StatusDot tone={status === "offline" ? "warning" : "success"} />
        {t("calendar.value.done")}
      </>
    ) : status === "error" ? (
      <>
        <StatusDot tone="danger" />
        {t("calendar.value.failed")}
      </>
    ) : (
      t(changesOnly ? "calendar.value.scopeChanges" : "calendar.value.scopeAll")
    );

  return (
    <Section title={t("settings.calendar")}>
      <SettingsRow
        icon="list-filter"
        label={t("settings.calendarChangesOnly")}
        description={t("settings.calendarChangesOnlyHint")}
        checked={changesOnly}
        onCheckedChange={(checked) => void setChangesOnly(checked)}
      />
      <SettingsRow
        icon="calendar-days"
        label={t("settings.calendarAdd")}
        description={t("settings.calendarAddHint")}
        value={value}
        disabled={working}
        onClick={() => setSheetOpen(true)}
      />
      <p
        role="status"
        aria-live="polite"
        className={
          status === "error"
            ? "px-4 py-2 font-text text-caption text-danger empty:hidden"
            : "px-4 py-2 font-text text-caption text-muted empty:hidden"
        }
      >
        {key === null ? "" : t(key, { count: eventCount })}
      </p>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={<SheetTitle icon="calendar-days">{t("settings.calendarAdd")}</SheetTitle>}
      >
        <SheetDescription>{t("settings.calendarSheetHint")}</SheetDescription>
        <div className="flex flex-col pb-1">
          {TARGETS.map(({ target, icon, label, hint }) => (
            <button
              key={target}
              type="button"
              onClick={() => {
                setSheetOpen(false);
                void exportTo(target, { changesOnly });
              }}
              className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border-0 bg-transparent px-1.5 py-2 text-left active:bg-sunken"
            >
              <Tile icon={icon} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-text text-body font-bold text-strong">{t(label)}</span>
                <span className="font-text text-caption text-muted">{t(hint)}</span>
              </span>
              <Icon name="download" size={18} className="shrink-0 text-muted" />
            </button>
          ))}
        </div>
      </BottomSheet>
    </Section>
  );
};
