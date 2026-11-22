import type { CalendarTarget } from "@/lib/calendar";
import type { IconName } from "@/ds";
import { useAppStore, useSettingSetter } from "@/store";
import { useCalendarExport } from "@/ui/calendar/useCalendarExport.ts";
import { useT, type MessageKey } from "@/ui/i18n";
import { Section } from "./settings-section.tsx";
import { SettingsRow } from "./settings-row.tsx";

const TARGETS: { target: CalendarTarget; icon: IconName; label: MessageKey; hint: MessageKey }[] = [
  {
    target: "google",
    icon: "calendar-days",
    label: "settings.calendarGoogle",
    hint: "settings.calendarGoogleHint",
  },
  {
    target: "apple",
    icon: "calendar-days",
    label: "settings.calendarApple",
    hint: "settings.calendarAppleHint",
  },
  {
    target: "outlook",
    icon: "calendar-days",
    label: "settings.calendarOutlook",
    hint: "settings.calendarOutlookHint",
  },
  {
    target: "ics",
    icon: "download",
    label: "settings.calendarOther",
    hint: "settings.calendarOtherHint",
  },
];

/** Export the next four weeks — substitutions, cancellations and moves included — to a calendar. */
export const CalendarSection = () => {
  const t = useT();
  const changesOnly = useAppStore((s) => s.settings.calendarChangesOnly);
  const setChangesOnly = useSettingSetter("calendarChangesOnly");
  const { exportTo, status, eventCount } = useCalendarExport();

  const message =
    status === "working"
      ? t("calendar.status.working")
      : status === "done"
        ? t("calendar.status.done", { count: eventCount })
        : status === "empty"
          ? t("calendar.status.empty")
          : status === "error"
            ? t("calendar.status.error")
            : "";

  return (
    <Section title={t("settings.calendar")}>
      {TARGETS.map(({ target, icon, label, hint }) => (
        <SettingsRow
          key={target}
          icon={icon}
          label={t(label)}
          description={t(hint)}
          onClick={() => void exportTo(target, { changesOnly })}
        />
      ))}
      <SettingsRow
        icon="arrow-left-right"
        label={t("settings.calendarChangesOnly")}
        description={t("settings.calendarChangesOnlyHint")}
        checked={changesOnly}
        onCheckedChange={(checked) => void setChangesOnly(checked)}
      />
      <p
        role="status"
        aria-live="polite"
        className="px-4 pt-1 font-text text-caption text-muted empty:hidden"
      >
        {message}
      </p>
    </Section>
  );
};
