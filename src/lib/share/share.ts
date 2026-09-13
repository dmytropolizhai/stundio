/**
 * Handing the finished PNG to whatever this platform calls "share".
 *
 * Three targets, in order of how close they get to the OS: the Android share sheet (the real
 * one, on the device the app ships on), the Web Share API (a phone browser running the dev
 * server), and a plain download (desktop). Everything is injected so the choice can be tested
 * without a device, and none of it touches the network — the image never leaves the phone
 * unless the user picks an app to send it to.
 */
import { nativeShare, type NativeSharePayload } from "./native.ts";

export type ShareOutcome = "native" | "web-share" | "download";

/** The slice of `navigator` the Web Share path needs; absent in a WebView and on desktop. */
export type ShareCapableNavigator = {
  share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
  canShare?: (data: { files?: File[] }) => boolean;
};

export type ShareEnvironment = {
  native: ((payload: NativeSharePayload) => Promise<void>) | null;
  navigator: ShareCapableNavigator | null;
  download: ((blob: Blob, fileName: string) => void) | null;
};

const PNG = "image/png";

/** base64 → bytes without `fetch(dataUrl)`, which tests forbid and offline devices dislike. */
export const base64ToBlob = (base64: string, type = PNG): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
};

const saveToDisk = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const browserShareEnvironment = (): ShareEnvironment => ({
  native: nativeShare(),
  navigator: typeof navigator === "undefined" ? null : navigator,
  download: typeof document === "undefined" ? null : saveToDisk,
});

export const shareImage = async (
  payload: NativeSharePayload,
  environment: ShareEnvironment = browserShareEnvironment(),
): Promise<ShareOutcome> => {
  if (environment.native !== null) {
    await environment.native(payload);
    return "native";
  }

  const blob = base64ToBlob(payload.base64);
  const nav = environment.navigator;

  if (nav?.share !== undefined) {
    const file = new File([blob], payload.fileName, { type: PNG });
    // `canShare` is what says whether *files* are supported — `share` alone is text-only on
    // several browsers, and calling it with a file there throws.
    if (nav.canShare?.({ files: [file] }) === true) {
      await nav.share({ title: payload.title, text: payload.text, files: [file] });
      return "web-share";
    }
  }

  if (environment.download !== null) {
    environment.download(blob, payload.fileName);
    return "download";
  }

  throw new Error("Sharing is not supported here");
};

export type { NativeSharePayload };
