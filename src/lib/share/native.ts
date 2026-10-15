/**
 * The one file in `lib/share/` allowed to touch Capacitor (mirrors `lib/edupage/http.ts`).
 *
 * Android's share sheet needs a real file behind a `content://` URI, which a WebView cannot
 * produce on its own — `navigator.share` does not exist there at all. So the PNG crosses the
 * bridge as base64 and the `ImageShare` plugin
 * (`android/app/src/main/java/com/dmytropolizhai/stundio/ImageSharePlugin.java`) writes it into
 * the app's cache dir and hands the OS an `ACTION_SEND` intent.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { isDesktop, saveDesktopImage } from "@/lib/desktop";

export type NativeSharePayload = {
  /** Raw base64 PNG bytes — no `data:` prefix. */
  base64: string;
  fileName: string;
  /** The chooser's title. */
  title: string;
  /** Sent alongside the image, which is where the download link rides. */
  text: string;
};

export type ImageSharePlugin = {
  share(payload: NativeSharePayload): Promise<void>;
};

const ImageShare = registerPlugin<ImageSharePlugin>("ImageShare");

/** Android shares through the OS; Linux saves through the file portal. Browsers use fallback sharing. */
export const nativeShare = (): ((payload: NativeSharePayload) => Promise<void>) | null =>
  isDesktop()
    ? (payload) => saveDesktopImage(payload.base64, payload.fileName)
    : Capacitor.getPlatform() === "android"
      ? (payload) => ImageShare.share(payload)
      : null;
