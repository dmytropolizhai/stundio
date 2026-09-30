/**
 * Client-side Web Push notifications for modern browsers and iOS 16.4+ standalone PWAs.
 *
 * Interacts with `navigator.serviceWorker.ready.pushManager` to subscribe using
 * standard VAPID public keys, sending the push endpoint and keys to Cloudflare Pages
 * Function `/api-push/subscribe`.
 */
import type { Lang } from "@/ui/i18n";
import { teacherKey } from "@/lib/edupage";
import type { Persona } from "@/lib/persona";

/**
 * Whom this device wants pushes about: the active role plus the name the feed knows them by
 * (`store.identityLabel()`) — a class short for a student, a teacher's name for a teacher.
 */
export type PushTarget = { persona: Persona; label: string };

const sha256Hex = async (message: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * The registration body's role half. A teacher is sent as the SHA-256 of their normalised
 * name key, never the name: the server only has to recognise the teacher in the feed (it
 * hashes the names it reads the same way), not know who is subscribed.
 */
const targetFields = async ({
  persona,
  label,
}: PushTarget): Promise<{ className: string } | { teacherKeyHash: string }> =>
  persona === "teacher"
    ? { teacherKeyHash: await sha256Hex(teacherKey(label)) }
    : { className: label };

export const VAPID_PUBLIC_KEY =
  "BBb4nnU3LcNCjbU9tSotemIqe6m10tH5mXExCi5CO78DpOljO3e1UX1kXem2goXDcNG3z0dcqZc5K1iaTYtTuYA";

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isWebPushSupported = (): boolean => {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

export const getWebPushPermission = (): NotificationPermission => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "default";
  }
  return Notification.permission;
};

export const requestWebPushPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return await Notification.requestPermission();
};

export const getExistingWebPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isWebPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
};

/**
 * Registers this device for "your timetable changed" pushes, prompting for permission if it has
 * never been asked — so only call it from somewhere the user has just asked for notifications.
 *
 * A student's label is the class's DISPLAY SHORT ("1DP1"), never `selectedClassId`: the checker
 * files subscribers under the section headers EduPage publishes, and an id matches none of them.
 * Re-registering under a different class — or role — is also how a device migrates off a stale
 * key, so this is safe (and cheap) to call again with the same subscription.
 */
export const subscribeWebPush = async (
  target: PushTarget,
  lang: Lang,
): Promise<PushSubscription | null> => {
  if (!isWebPushSupported()) return null;

  const currentPermission = getWebPushPermission();
  const permission =
    currentPermission === "default" ? await requestWebPushPermission() : currentPermission;

  if (permission !== "granted") {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
    }

    const subJson = sub.toJSON();
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!p256dh || !auth) {
      return null;
    }

    await fetch("/api-push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: { p256dh, auth },
        ...(await targetFields(target)),
        lang,
      }),
    });

    return sub;
  } catch {
    return null;
  }
};

/**
 * The same registration, but never prompting: for re-filing an existing subscription on boot
 * (the class or role it is indexed under changed, or it was registered before the app sent a
 * usable one at all). A device that has not granted permission has nothing to re-file.
 */
export const refreshWebPushSubscription = async (target: PushTarget, lang: Lang): Promise<void> => {
  if (!isWebPushSupported() || getWebPushPermission() !== "granted") return;
  await subscribeWebPush(target, lang);
};

export const unsubscribeWebPush = async (): Promise<boolean> => {
  if (!isWebPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    const endpoint = sub.endpoint;
    await sub.unsubscribe();

    await fetch("/api-push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});

    return true;
  } catch {
    return false;
  }
};

/** Cooldown guard to avoid spamming the report-change endpoint on consecutive reloads. */
let lastReportedTime = 0;
const REPORT_COOLDOWN_MS = 60_000;

export const reportSubstitutionChangeToServer = async (
  changedDates: readonly string[],
): Promise<void> => {
  if (changedDates.length === 0) return;
  const now = Date.now();
  if (now - lastReportedTime < REPORT_COOLDOWN_MS) return;
  lastReportedTime = now;

  try {
    await fetch("/api-push/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changedDates }),
    });
  } catch {
    // Non-blocking best-effort notification report
  }
};
