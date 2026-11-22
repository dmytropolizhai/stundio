/**
 * "Add my timetable to a calendar" end to end: read this week and the next three out of the
 * store, turn them into calendar events and hand them to the chosen target.
 *
 * Like sharing a week, nothing is uploaded — the events are built on the device. Dates are
 * Riga's (CLAUDE.md), never the device's.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { identityKey as identityKeyOf } from "@/lib/persona";
import { startOfWeek } from "@/lib/schedule";
import {
  eventsForRange,
  routeCalendarExport,
  type CalendarLabels,
  type CalendarTarget,
  type ExportOutcome,
  type ExportRange,
} from "@/lib/calendar";
import { addDays, todayInRiga } from "@/sync";
import { translate, useLang } from "@/ui/i18n";
import { useIdentity } from "@/ui/persona";
import { resolveShareSubject } from "@/ui/share/subject.ts";

export type CalendarExportStatus = "idle" | "working" | "done" | "offline" | "empty" | "error";

/** This week plus the next three. */
export const EXPORT_WEEKS = 4;

type Outcome = ExportOutcome | { kind: "cancelled" };

export const useCalendarExport = (): {
  exportTo: (target: CalendarTarget, opts?: { changesOnly?: boolean }) => Promise<void>;
  status: CalendarExportStatus;
  lastOutcome: Outcome | null;
  eventCount: number;
} => {
  const lang = useLang();
  const [status, setStatus] = useState<CalendarExportStatus>("idle");
  const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null);
  const [eventCount, setEventCount] = useState(0);

  const busy = useRef(false);

  const identity = useIdentity();
  const identityKey = useMemo(() => identityKeyOf(identity), [identity]);
  const timetables = useAppStore((s) => s.timetables);
  const resolvedDay = useAppStore((s) => s.resolvedDay);

  const subject = useMemo(
    () => resolveShareSubject(identity, Object.values(timetables)),
    [identity, timetables],
  );

  const exportTo = useCallback(
    async (target: CalendarTarget, opts?: { changesOnly?: boolean }): Promise<void> => {
      // A second tap while the share sheet is open would stack a second export on top of it.
      if (busy.current) return;
      busy.current = true;
      setStatus("working");
      try {
        const t = (key: Parameters<typeof translate>[1]) => translate(lang, key);
        const labels: CalendarLabels = {
          cancelled: t("calendar.label.cancelled"),
          moved: t("calendar.label.moved"),
          substituted: t("calendar.label.substituted"),
          roomChange: t("calendar.label.roomChange"),
          added: t("calendar.label.added"),
          teachers: t("calendar.label.teachers"),
          group: t("calendar.label.group"),
          changeNote: t("calendar.label.changeNote"),
        };
        const monday = startOfWeek(todayInRiga());
        const range: ExportRange = {
          from: monday,
          to: addDays(monday, (EXPORT_WEEKS - 1) * 7 + 4), // the last week's Friday
        };
        const events = eventsForRange(range, (date) => resolvedDay(date), labels, identityKey);
        if (events.length === 0) {
          setLastOutcome({ kind: "nothing-to-export" });
          setEventCount(0);
          setStatus("empty");
          return;
        }
        const name = subject === null ? "Stundio" : `Stundio · ${subject.label}`;
        // Google's import page is a website: offline it would open to a browser error after the
        // file was already shared. Deliver the file alone and say what's left to do.
        const offlineGoogle =
          target === "google" && typeof navigator !== "undefined" && !navigator.onLine;
        const outcome = await routeCalendarExport(offlineGoogle ? "ics" : target, events, {
          name,
          range,
          changesOnly: opts?.changesOnly === true,
        });
        setLastOutcome(outcome);
        if (outcome.kind === "cancelled") {
          setStatus("idle");
        } else if (outcome.kind === "nothing-to-export") {
          setEventCount(0);
          setStatus("empty");
        } else {
          setEventCount(outcome.eventCount);
          setStatus(offlineGoogle ? "offline" : "done");
        }
      } catch {
        setStatus("error");
      } finally {
        busy.current = false;
      }
    },
    [lang, resolvedDay, identityKey, subject],
  );

  return { exportTo, status, lastOutcome, eventCount };
};
