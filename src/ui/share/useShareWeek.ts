/**
 * "Share this week" end to end: read the week out of the store, paint it, hand it to the OS.
 *
 * Nothing here is uploaded. The PNG is drawn on the device and passed straight to Android's
 * share sheet, so sharing a timetable works on a school Wi-Fi that has already dropped —
 * the same promise the rest of the app makes (CLAUDE.md).
 */
import { useCallback, useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { findClassTeacher, type ISODate } from "@/lib/edupage";
import { weekDates } from "@/lib/schedule";
import { dataUrlToBase64, renderShareImage, shareImage } from "@/lib/share";
import { translate, useLang } from "@/ui/i18n";
import { shareTheme } from "./palette.ts";
import { buildWeekImageData, weekShareFileName, weekShareText } from "./weekImage.ts";

export type ShareWeekStatus = "idle" | "working" | "error";

/** A cancelled share sheet is a decision, not a failure — the Web Share API reports it as one. */
const isCancel = (error: unknown): boolean => error instanceof Error && error.name === "AbortError";

export const useShareWeek = (
  date: ISODate,
): {
  share: () => void;
  status: ShareWeekStatus;
  disabled: boolean;
  /** The one-time "which language to share in" prompt — render `ShareLanguageDialog` off this. */
  languagePrompt: { open: boolean; onDone: () => void };
} => {
  const lang = useLang();
  const [status, setStatus] = useState<ShareWeekStatus>("idle");
  const [promptOpen, setPromptOpen] = useState(false);

  const classId = useAppStore((s) => s.settings.selectedClassId);
  const timetables = useAppStore((s) => s.timetables);
  const resolvedDay = useAppStore((s) => s.resolvedDay);
  const substitutions = useAppStore((s) => s.substitutions);
  const trackEvent = useAppStore((s) => s.trackEvent);
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const shareLang = useAppStore((s) => s.settings.shareLang);
  const shareLangSyncWithApp = useAppStore((s) => s.settings.shareLangSyncWithApp);
  const shareLangPromptShown = useAppStore((s) => s.settings.shareLangPromptShown);
  const setShareLangPromptShown = useAppStore((s) => s.setShareLangPromptShown);

  /** The share image/message travels in its own language — separate from the app's chrome. */
  const effectiveLang = shareLangSyncWithApp ? lang : shareLang;
  const shareT = useMemo(
    () =>
      (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
        translate(effectiveLang, key, params),
    [effectiveLang],
  );

  const dates = useMemo(() => weekDates(date), [date]);

  const days = useMemo(
    () => dates.map((d) => resolvedDay(d)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store data drives the result
    [dates, resolvedDay, timetables, substitutions, classId],
  );

  const selected = useMemo(() => {
    if (classId === null) return null;
    for (const timetable of Object.values(timetables)) {
      const found = timetable.classes.find((c) => c.id === classId);
      if (found !== undefined) return found;
    }
    return null;
  }, [timetables, classId]);

  const run = useCallback(async (): Promise<void> => {
    if (selected === null) return;
    setStatus("working");

    try {
      // The card is drawn with the bundled Manrope/JetBrains Mono faces; asking for them before
      // the first `fillText` is what stops a cold open from exporting a Times New Roman week.
      // Optional because `FontFaceSet` is not everywhere — without it the export is still
      // correct, just possibly in a fallback face.
      await document.fonts?.ready;

      const theme = shareTheme();
      const data = buildWeekImageData({
        dates,
        days,
        className: selected.short,
        classTeacher: findClassTeacher(Object.values(timetables), selected.id)?.short ?? null,
        theme,
        subjectColorOverrides,
        lang: effectiveLang,
        t: shareT,
      });

      const { dataUrl } = renderShareImage(data, { palette: theme.palette });

      await shareImage({
        base64: dataUrlToBase64(dataUrl),
        fileName: weekShareFileName(selected.short, dates[0]),
        title: shareT("share.title", { class: selected.short }),
        text: weekShareText(selected.short, data.period, shareT),
      });

      trackEvent("share_week");
      setStatus("idle");
    } catch (error) {
      setStatus(isCancel(error) ? "idle" : "error");
    }
  }, [dates, days, effectiveLang, selected, shareT, subjectColorOverrides, timetables, trackEvent]);

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
    status,
    disabled: selected === null || status === "working",
    languagePrompt: { open: promptOpen, onDone: dismissLanguagePrompt },
  };
};