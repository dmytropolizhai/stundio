/**
 * The one file in `lib/calendar/` allowed to touch Capacitor (mirrors `lib/share/native.ts`).
 *
 * Android has no `navigator.share`, so the `.ics` rides the existing `ImageShare` plugin —
 * which already writes a cache file and fires `ACTION_SEND` through the app's `FileProvider` —
 * with the optional `mimeType` set to `text/calendar`. Reusing it avoids a second plugin,
 * a second registration (MainActivity and WidgetSyncActivity) and a second cache directory.
 * Desktop returns null: `saveDesktopImage` is PNG-only, so the browser download fallback does it.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export type NativeCalendarPayload = {
  text: string;
  fileName: string;
  title: string;
  /** Open the file in a calendar app (ACTION_VIEW) rather than offering the share sheet. */
  view?: boolean;
};

type CalendarSharePlugin = {
  share(payload: {
    base64: string;
    fileName: string;
    title: string;
    text: string;
    mimeType: string;
    view: boolean;
  }): Promise<void>;
};

const ImageShare = registerPlugin<CalendarSharePlugin>("ImageShare");

/** UTF-8 -> base64: `btoa` alone throws on Latvian letters and the ⚠ marker. */
const utf8ToBase64 = (text: string): string => {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export const nativeCalendarShare = ():
  ((payload: NativeCalendarPayload) => Promise<void>) | null =>
  Capacitor.getPlatform() === "android"
    ? (payload) =>
        ImageShare.share({
          base64: utf8ToBase64(payload.text),
          fileName: payload.fileName,
          title: payload.title,
          text: "",
          mimeType: "text/calendar",
          view: payload.view === true,
        })
    : null;
