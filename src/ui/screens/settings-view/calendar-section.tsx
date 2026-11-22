import type { CalendarTarget } from "@/lib/calendar";
import { Icon, cn, type IconName } from "@/ds";
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
          ? t(changesOnly ? "calendar.status.emptyChanges" : "calendar.status.empty")
          : status === "error"
            ? t("calendar.status.error")
            : "";
  const working = status === "working";

  return (
    <Section title={t("settings.calendar")}>
      <SettingsRow
        icon="arrow-left-right"
        label={t("settings.calendarChangesOnly")}
        description={t("settings.calendarChangesOnlyHint")}
        checked={changesOnly}
        onCheckedChange={(checked) => void setChangesOnly(checked)}
      />
      {TARGETS.map(({ target, icon, label, hint }) => (
        <SettingsRow
          key={target}
          icon={icon}
          label={t(label)}
          description={t(hint)}
          disabled={working}
          trailing={<Icon name="download" size={18} />}
          onClick={() => void exportTo(target, { changesOnly })}
        />
      ))}
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "px-4 pt-1 font-text text-caption empty:hidden",
          status === "error" ? "text-danger" : "text-muted",
        )}
      >
        {message}
      </p>
    </Section>
  );
};
