/**
 * Compact date-stepping dock floating directly above the phone bottom bar on Home and Week.
 * Puts previous/next stepping, the calendar picker and the "Today" jump into the thumb zone,
 * reading and writing through the shell's shared `ScheduleNavigation` so Home and Week stay in
 * sync. Hidden while the soft keyboard is open so small viewports keep their content area.
 */
import { useEffect, useState } from "react";
import { IconButton } from "@/ds";
import { formatWeekRange, useLang, useT } from "@/ui/i18n";
import type { ScheduleNavigation } from "@/ui/hooks/useScheduleNavigation.ts";
import { DatePicker } from "./DatePicker.tsx";

type DateDockProps = {
  mode: "day" | "week";
  nav: ScheduleNavigation;
};

/** Detects when a soft keyboard shrinks the visual viewport significantly on mobile. */
const useKeyboardOpen = (): boolean => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (vv === null || vv === undefined) return;
    const check = () => {
      const active = document.activeElement;
      const isField =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;
      setOpen(isField && vv.height < window.innerHeight * 0.75);
    };
    vv.addEventListener("resize", check);
    return () => {
      vv.removeEventListener("resize", check);
    };
  }, []);

  return open;
};

export const DateDock = ({ mode, nav }: DateDockProps) => {
  const t = useT();
  const lang = useLang();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const keyboardOpen = useKeyboardOpen();

  if (keyboardOpen) return null;

  const isDay = mode === "day";
  const showToday = isDay ? !nav.isToday : !nav.isThisWeek;
  const weekTitle =
    nav.firstDay !== undefined && nav.lastDay !== undefined
      ? formatWeekRange(nav.firstDay, nav.lastDay, lang)
      : t("nav.week");

  return (
    <div
      data-testid="date-dock"
      className="u-nav-glass pointer-events-auto flex h-11 w-full items-center justify-between gap-1 rounded-pill px-1.5"
    >
      <IconButton
        icon="chevron-left"
        label={isDay ? t("day.previousDay") : t("dock.prevWeek")}
        variant="bare"
        size="sm"
        onClick={isDay ? nav.prevDay : nav.prevWeek}
      />

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
        <DatePicker
          date={nav.date}
          today={nav.today}
          open={calendarOpen}
          onOpenChange={setCalendarOpen}
          onSelect={nav.setDate}
          title={isDay ? undefined : weekTitle}
          iconSize={16}
          className="min-h-9 max-w-full px-2 font-text text-caption font-bold text-strong"
        />

        {showToday && (
          <button
            type="button"
            data-testid="dock-today"
            onClick={nav.jumpToToday}
            className="inline-flex h-7 shrink-0 cursor-pointer items-center rounded-pill bg-sunken px-2.5 font-text text-micro font-bold text-strong transition-colors duration-(--dur-fast) ease-standard active:scale-(--press-scale) active:duration-(--dur-instant)"
          >
            {t("dock.today")}
          </button>
        )}
      </div>

      <IconButton
        icon="chevron-right"
        label={isDay ? t("day.nextDay") : t("dock.nextWeek")}
        variant="bare"
        size="sm"
        onClick={isDay ? nav.nextDay : nav.nextWeek}
      />
    </div>
  );
};
