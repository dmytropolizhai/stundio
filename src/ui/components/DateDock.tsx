/**
 * Compact date-stepping dock floating directly above the phone bottom bar on Home, Week, and
 * Changes. Puts previous/next stepping, the calendar picker and the "Today" jump into the thumb
 * zone, reading and writing through the shell's shared `ScheduleNavigation` so Home, Week, and
 * Changes stay in sync. Hidden while the soft keyboard is open so small viewports keep their
 * content area.
 */
import { useEffect, useState } from "react";
import { IconButton } from "@/ds";
import { formatShortDate, formatWeekRange, useLang, useT } from "@/ui/i18n";
import type { ScheduleNavigation } from "@/ui/hooks/useScheduleNavigation.ts";
import { isDarkTone, toneFieldVars, type SubjectAccent } from "@/ui/theme";
import { DatePicker } from "./DatePicker.tsx";

export type DateDockNowToggle = {
  accent: SubjectAccent;
  countdown: string;
  label: string;
  live: boolean;
  onShowNow: () => void;
};

type DateDockProps = {
  mode: "day" | "week";
  nav: ScheduleNavigation;
  /** When a lesson is live or upcoming, shows a compact chip to flip the dock back to `NowDock`. */
  nowToggle?: DateDockNowToggle;
  /** Runs the horizontal Apple-style spring "bimp" expansion out of the trailing calendar icon. */
  animateFrom?: "right";
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

export const DateDock = ({ mode, nav, nowToggle, animateFrom }: DateDockProps) => {
  const t = useT();
  const lang = useLang();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const keyboardOpen = useKeyboardOpen();

  if (keyboardOpen) return null;

  const isDay = mode === "day";
  const showToday = isDay ? !nav.isToday : !nav.isThisWeek;
  const dayTitle = formatShortDate(nav.date, lang);
  const weekTitle =
    nav.firstDay !== undefined && nav.lastDay !== undefined
      ? formatWeekRange(nav.firstDay, nav.lastDay, lang)
      : t("nav.week");

  return (
    <div
      data-testid="date-dock"
      className={
        animateFrom === "right"
          ? "u-nav-glass u-dock-bimp-from-right pointer-events-auto flex h-11 w-full items-center rounded-pill px-1.5"
          : "u-nav-glass pointer-events-auto flex h-11 w-full items-center rounded-pill px-1.5"
      }
    >
      <div className="u-dock-bimp-content flex w-full items-center justify-between gap-1">
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
            title={isDay ? dayTitle : weekTitle}
            {...(!isDay && nav.firstDay !== undefined && nav.lastDay !== undefined
              ? { range: [nav.firstDay, nav.lastDay] as const }
              : {})}
            align="center"
            iconSize={16}
            className="min-h-9 max-w-full px-2 font-text text-caption font-bold text-strong"
          />

          {showToday && (
            <button
              type="button"
              data-testid="dock-today"
              onClick={nav.jumpToToday}
              className="relative inline-flex h-7 shrink-0 before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] cursor-pointer items-center rounded-pill bg-sunken px-2.5 font-text text-micro font-bold text-strong transition-colors duration-(--dur-fast) ease-standard active:scale-(--press-scale) active:duration-(--dur-instant)"
            >
              {t("dock.today")}
            </button>
          )}

          {nowToggle !== undefined && (
            <button
              type="button"
              data-testid="dock-now-toggle"
              aria-label={nowToggle.label}
              onClick={nowToggle.onShowNow}
              style={nowToggle.live ? toneFieldVars(nowToggle.accent) : undefined}
              {...(nowToggle.live && isDarkTone(nowToggle.accent) ? { "data-tone-dark": "" } : {})}
              className={
                nowToggle.live
                  ? "u-tone-field u-tone-field-deep relative inline-flex h-7 shrink-0 before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] cursor-pointer items-center rounded-pill px-2.5 font-data text-[11px] font-semibold tabular-nums text-on-deep transition-transform duration-(--dur-instant) active:scale-(--press-scale)"
                  : "relative inline-flex h-7 shrink-0 before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] cursor-pointer items-center gap-1.5 rounded-pill bg-sunken px-2.5 font-data text-[11px] font-semibold tabular-nums text-strong transition-transform duration-(--dur-instant) active:scale-(--press-scale)"
              }
            >
              {!nowToggle.live && (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      nowToggle.accent.tone === "custom"
                        ? nowToggle.accent.fill
                        : `var(--accent-${nowToggle.accent.tone})`,
                  }}
                />
              )}
              {nowToggle.countdown}
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
    </div>
  );
};
