/**
 * "Share this week" end to end: read the week out of the store, paint it, hand it to the OS.
 *
 * Nothing here is uploaded. The PNG is drawn on the device and passed straight to Android's
 * share sheet, so sharing a timetable works on a school Wi-Fi that has already dropped —
 * the same promise the rest of the app makes (CLAUDE.md).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore, useSettingSetter } from "@/store";
import { todayInRiga } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { identityKey as identityKeyOf } from "@/lib/persona";
import { buildShareUrl, type AppRoute } from "@/lib/router";
import { weekDates } from "@/lib/schedule";
import {
  dataUrlToBase64,
  renderShareImage,
  shareImage,
  shareLink as shareWeekUrl,
} from "@/lib/share";
import { translate, useLang } from "@/ui/i18n";
import { useIdentity } from "@/ui/persona";
import { shareTheme } from "./palette.ts";
import { resolveShareSubject } from "./subject.ts";
import { buildWeekImageData, weekShareFileName, weekShareText } from "./weekImage.ts";

export type ShareWeekStatus = "idle" | "working" | "copied" | "error" | "link-error";

const COPIED_FEEDBACK_MS = 2500;

/** A cancelled share sheet is a decision, not a failure — the Web Share API reports it as one. */
const isCancel = (error: unknown): boolean => error instanceof Error && error.name === "AbortError";

/**
 * Builds the shareable week route for a link:
 * - Current week → `/class/<group>/week` (or `/teacher/<slug>/week`), clean and evergreen.
 * - Any other week → `/class/<group>/week/<YYYY-MM-DD>` so the recipient lands on that exact week.
 */
export const weekShareLinkRoute = (
  baseRoute: AppRoute,
  dates: readonly ISODate[],
  today: ISODate,
): AppRoute => {
  if (baseRoute.kind === "root") return { kind: "root" };
  const monday = dates[0];
  if (monday === undefined || dates.includes(today)) {
    return { ...baseRoute, view: "week" };
  }
  return { ...baseRoute, view: "week", date: monday };
};

export const useShareWeek = (
  date: ISODate,
  today: ISODate = todayInRiga(),
): {
  share: () => void;
  shareLink: () => void;
  status: ShareWeekStatus;
  disabled: boolean;
  /** The one-time "which language to share in" prompt — render `ShareLanguageDialog` off this. */
  languagePrompt: { open: boolean; onDone: () => void };
} => {
  const lang = useLang();
  const [status, setStatus] = useState<ShareWeekStatus>("idle");
  const [promptOpen, setPromptOpen] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCopiedTimer = useCallback(() => {
    if (copiedTimerRef.current !== null) {
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearCopiedTimer, [clearCopiedTimer]);

  const identity = useIdentity();
  const identityKey = useMemo(() => identityKeyOf(identity), [identity]);
  const timetables = useAppStore((s) => s.timetables);
  const resolvedDay = useAppStore((s) => s.resolvedDay);
  const substitutions = useAppStore((s) => s.substitutions);
  const trackEvent = useAppStore((s) => s.trackEvent);
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const subjectColorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);
  const groupColorOverrides = useAppStore((s) => s.settings.groupColorOverrides);
  const shareLang = useAppStore((s) => s.settings.shareLang);
  const shareLangSyncWithApp = useAppStore((s) => s.settings.shareLangSyncWithApp);
  const shareLangPromptShown = useAppStore((s) => s.settings.shareLangPromptShown);
  const setShareLangPromptShown = useSettingSetter("shareLangPromptShown");

  /** The share image/message travels in its own language — separate from the app's chrome. */
  const effectiveLang = shareLangSyncWithApp ? lang : shareLang;
  const shareT = useMemo(
    () => (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
      translate(effectiveLang, key, params),
    [effectiveLang],
  );

  const dates = useMemo(() => weekDates(date), [date]);

  const days = useMemo(
    () => dates.map((d) => resolvedDay(d)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store data drives the result
    [dates, resolvedDay, timetables, substitutions, identityKey],
  );

  const subject = useMemo(
    () => resolveShareSubject(identity, Object.values(timetables)),
    [identity, timetables],
  );

  const run = useCallback(async (): Promise<void> => {
    if (subject === null) return;
    clearCopiedTimer();
    setStatus("working");

    try {
      // The card is drawn with the bundled Onest/Martian Mono faces; asking for them before
      // the first `fillText` is what stops a cold open from exporting a Times New Roman week.
      // Optional because `FontFaceSet` is not everywhere — without it the export is still
      // correct, just possibly in a fallback face.
      await document.fonts?.ready;

      const weekRoute: AppRoute =
        subject.route.kind === "root"
          ? { kind: "root" }
          : {
              ...subject.route,
              view: "week",
              ...(dates[0] === undefined ? {} : { date: dates[0] }),
            };
      const shareUrl = buildShareUrl(weekRoute);

      const theme = shareTheme();
      const data = buildWeekImageData({
        dates,
        days,
        title: subject.label,
        classTeacher: subject.classTeacher,
        theme,
        subjectColorOverrides,
        groupColorOverrides,
        subjectColorCodingEnabled,
        lang: effectiveLang,
        t: shareT,
        url: shareUrl,
      });

      const { dataUrl } = renderShareImage(data, { palette: theme.palette });

      await shareImage({
        base64: dataUrlToBase64(dataUrl),
        fileName: weekShareFileName(subject.label, dates[0]),
        title: shareT("share.title", { name: subject.label }),
        text: weekShareText(subject.label, data.period, shareT, shareUrl),
      });

      trackEvent("share_week");
      setStatus("idle");
    } catch (error) {
      setStatus(isCancel(error) ? "idle" : "error");
    }
  }, [
    dates,
    days,
    effectiveLang,
    subject,
    shareT,
    subjectColorOverrides,
    groupColorOverrides,
    subjectColorCodingEnabled,
    trackEvent,
    clearCopiedTimer,
  ]);

  const shareLink = useCallback(() => {
    if (subject === null) return;
    clearCopiedTimer();
    const url = buildShareUrl(weekShareLinkRoute(subject.route, dates, today));
    const title = translate(lang, "share.title", { name: subject.label });

    void (async () => {
      try {
        const outcome = await shareWeekUrl({ url, title });
        trackEvent("share_week_link");
        if (outcome === "clipboard") {
          setStatus("copied");
          copiedTimerRef.current = setTimeout(() => {
            copiedTimerRef.current = null;
            setStatus("idle");
          }, COPIED_FEEDBACK_MS);
        } else {
          setStatus("idle");
        }
      } catch (error) {
        setStatus(isCancel(error) ? "idle" : "link-error");
      }
    })();
  }, [clearCopiedTimer, dates, lang, subject, today, trackEvent]);

  const share = useCallback(() => {
    if (!shareLangPromptShown) {
      setPromptOpen(true);
      return;
    }
    void run();
  }, [run, shareLangPromptShown]);

  const dismissLanguagePrompt = useCallback(() => {
    setPromptOpen(false);
    void setShareLangPromptShown(true);
    void run();
  }, [run, setShareLangPromptShown]);

  return {
    share,
    shareLink,
    status,
    disabled: subject === null || status === "working",
    languagePrompt: { open: promptOpen, onDone: dismissLanguagePrompt },
  };
};
