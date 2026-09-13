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

/** Android only — the plugin is this app's own, and there is no iOS target. */
export const nativeShare = (): ((payload: NativeSharePayload) => Promise<void>) | null =>
  Capacitor.getPlatform() === "android" ? (payload) => ImageShare.share(payload) : null;
