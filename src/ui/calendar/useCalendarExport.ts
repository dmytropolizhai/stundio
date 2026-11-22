/**
 * "Add my timetable to a calendar" end to end: read the school week out of the
 * store, turn them into calendar events and hand them to the chosen target.
 *
 * Like sharing a week, nothing is uploaded — the events are built on the device. Dates are
 * Riga's (CLAUDE.md), never the device's.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useAppStore, useSettingSetter } from "@/store";
import { identityKey as identityKeyOf } from "@/lib/persona";
import { currentPlatform } from "@/lib/platform";
import { startOfWeek } from "@/lib/schedule";
import {
  GOOGLE_CALENDAR_SCOPE,
  GoogleAuthError,
  GoogleSignInCancelled,
  eventsForRange,
  exportToGoogleCalendar,
  googleIdentity,
  loadGoogleIdentity,
  requestGoogleToken,
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

export type CalendarExportStatus =
  | "idle"
  | "working"
  | "done"
  | "offline"
  | "empty"
  | "error"
  /** Google refused the token or the calendar permission. */
  | "signInError";

/**
 * The OAuth client id of the Stundio Google Cloud project. A client id is public by design (it
 * ships in the page of every Google sign-in), unlike a secret; without one the Google row falls
 * back to the file route. Set `VITE_GOOGLE_CLIENT_ID` at build time (README → Google Calendar).
 */
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";

/** Browsers only: Google blocks its sign-in inside an Android WebView and the desktop shell. */
const canSignInToGoogle = (): boolean =>
  GOOGLE_CLIENT_ID !== "" &&
  currentPlatform() === "web" &&
  typeof navigator !== "undefined" &&
  navigator.onLine;

/** One school week: this one, or the coming one from Saturday on (the week just gone is moot). */
export const EXPORT_WEEKS = 1;

type Outcome = ExportOutcome | { kind: "cancelled" };

export const useCalendarExport = (): {
  exportTo: (target: CalendarTarget, opts?: { changesOnly?: boolean }) => Promise<void>;
  status: CalendarExportStatus;
  lastOutcome: Outcome | null;
  eventCount: number;
  /** Lessons Google refused on a sign-in export (the rest went in). */
  failedCount: number;
  /** Whether the Google row can add lessons in one tap instead of saving a file. */
  googleSignIn: boolean;
  /** Loads Google's sign-in script ahead of the tap that needs it (the popup can't wait). */
  prepareGoogle: () => void;
} => {
  const lang = useLang();
  const [status, setStatus] = useState<CalendarExportStatus>("idle");
  const [lastOutcome, setLastOutcome] = useState<Outcome | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const googleSignIn = canSignInToGoogle();
  const googleCalendarId = useAppStore((s) => s.settings.googleCalendarId);
  const setGoogleCalendarId = useSettingSetter("googleCalendarId");

  const busy = useRef(false);

  const identity = useIdentity();
  const identityKey = useMemo(() => identityKeyOf(identity), [identity]);
  const timetables = useAppStore((s) => s.timetables);
  const resolvedDay = useAppStore((s) => s.resolvedDay);
  const customName = useAppStore((s) => s.settings.calendarName);

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
        const today = todayInRiga();
        const thisMonday = startOfWeek(today);
        // `startOfWeek` puts Sat/Sun in the week just gone; there is nothing left in it to export.
        const monday = today > addDays(thisMonday, 4) ? addDays(thisMonday, 7) : thisMonday;
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
        const auto = subject === null ? "Stundio" : `Stundio · ${subject.label}`;
        const name = customName.trim() === "" ? auto : customName.trim();
        // Google's import page is a website: offline it would open to a browser error after the
        // file was already shared. Deliver the file alone and say what's left to do.
        const offlineGoogle =
          target === "google" && typeof navigator !== "undefined" && !navigator.onLine;

        // One-tap Google: the consent popup has to open from this tap, so the token is requested
        // here, before any `await`, and only if the sign-in script was loaded ahead of time.
        if (
          target === "google" &&
          !offlineGoogle &&
          googleSignIn &&
          googleIdentity() !== undefined
        ) {
          const token = await requestGoogleToken(GOOGLE_CLIENT_ID, GOOGLE_CALENDAR_SCOPE);
          const chosen =
            opts?.changesOnly === true ? events.filter((e) => e.change !== "none") : events;
          if (chosen.length === 0) {
            setLastOutcome({ kind: "nothing-to-export" });
            setEventCount(0);
            setStatus("empty");
            return;
          }
          const result = await exportToGoogleCalendar(
            { token, fetch: globalThis.fetch.bind(globalThis) },
            chosen,
            { name, calendarId: googleCalendarId },
          );
          if (result.calendarId !== googleCalendarId) void setGoogleCalendarId(result.calendarId);
          setLastOutcome({ kind: "google-api", ...result });
          setEventCount(result.imported);
          setFailedCount(result.failed);
          setStatus(result.imported === 0 ? "error" : "done");
          return;
        }

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
        } else if (outcome.kind === "google-api") {
          // `routeCalendarExport` never returns this; the sign-in path above owns it.
          setStatus("done");
        } else {
          setEventCount(outcome.eventCount);
          setFailedCount(0);
          setStatus(offlineGoogle ? "offline" : "done");
        }
      } catch (error) {
        if (error instanceof GoogleSignInCancelled) setStatus("idle");
        else if (error instanceof GoogleAuthError) setStatus("signInError");
        else setStatus("error");
      } finally {
        busy.current = false;
      }
    },
    [
      lang,
      resolvedDay,
      identityKey,
      subject,
      customName,
      googleSignIn,
      googleCalendarId,
      setGoogleCalendarId,
    ],
  );

  const prepareGoogle = useCallback(() => {
    if (googleSignIn) void loadGoogleIdentity().catch(() => undefined);
  }, [googleSignIn]);

  return { exportTo, status, lastOutcome, eventCount, failedCount, googleSignIn, prepareGoogle };
};
