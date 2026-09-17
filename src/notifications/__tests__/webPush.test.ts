import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  urlBase64ToUint8Array,
  isWebPushSupported,
  getWebPushPermission,
  requestWebPushPermission,
  getExistingWebPushSubscription,
  subscribeWebPush,
  refreshWebPushSubscription,
  unsubscribeWebPush,
  reportSubstitutionChangeToServer,
  VAPID_PUBLIC_KEY,
} from "../webPush.ts";

describe("webPush", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "PushManager");
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("converts URL safe base64 to Uint8Array accurately", () => {
    const arr = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    expect(arr).toBeInstanceOf(Uint8Array);
    expect(arr.length).toBeGreaterThan(0);
  });

  it("checks Web Push support correctly", () => {
    expect(isWebPushSupported()).toBe(false);

    vi.stubGlobal("Notification", { permission: "default", requestPermission: vi.fn() });
    Reflect.set(window, "PushManager", class {});
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve({ pushManager: {} }) },
      configurable: true,
    });

    expect(isWebPushSupported()).toBe(true);
  });

  it("checks and requests notification permissions", async () => {
    expect(getWebPushPermission()).toBe("default");

    const reqMock = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission: reqMock });

    const res = await requestWebPushPermission();
    expect(res).toBe("granted");
    expect(reqMock).toHaveBeenCalled();
  });

  it("returns existing subscription", async () => {
    const mockSub = { endpoint: "https://test.com" };
    vi.stubGlobal("Notification", { permission: "granted" });
    Reflect.set(window, "PushManager", class {});
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSub),
          },
        }),
      },
      configurable: true,
    });

    const sub = await getExistingWebPushSubscription();
    expect(sub).toBe(mockSub);
  });

  it("subscribes to Web Push and sends payload to /api-push/subscribe", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);

    const mockSub = {
      endpoint: "https://fcm.googleapis.com/test",
      toJSON: () => ({
        keys: { p256dh: "mockP256dh", auth: "mockAuth" },
      }),
    };

    const subscribeMock = vi.fn().mockResolvedValue(mockSub);
    const getSubMock = vi.fn().mockResolvedValue(null);

    vi.stubGlobal("Notification", {
      permission: "granted",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
    Reflect.set(window, "PushManager", class {});
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: getSubMock,
            subscribe: subscribeMock,
          },
        }),
      },
      configurable: true,
    });

    const sub = await subscribeWebPush("1DP1", "lv");
    expect(sub).toBe(mockSub);
    expect(subscribeMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api-push/subscribe",
      expect.objectContaining({
        method: "POST",
      }),
    );

    // The class's display short is what the checker files recipients under; sending anything
    // else (an EduPage id, as this used to) registers the device under a key nobody reads.
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(init.body)).toMatchObject({ className: "1DP1", lang: "lv" });
  });

  it("re-files an existing subscription without ever prompting", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);

    const requestPermission = vi.fn().mockResolvedValue("granted");
    const mockSub = {
      endpoint: "https://fcm.googleapis.com/test",
      toJSON: () => ({ keys: { p256dh: "mockP256dh", auth: "mockAuth" } }),
    };

    vi.stubGlobal("Notification", { permission: "granted", requestPermission });
    Reflect.set(window, "PushManager", class {});
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          pushManager: { getSubscription: vi.fn().mockResolvedValue(mockSub) },
        }),
      },
      configurable: true,
    });

    await refreshWebPushSubscription("1DP1", "lv");

    expect(requestPermission).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api-push/subscribe", expect.anything());
  });

  it("does not register anything on boot when permission was never granted", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    Reflect.set(window, "PushManager", class {});
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve({ pushManager: {} }) },
      configurable: true,
    });

    await refreshWebPushSubscription("1DP1", "lv");

    expect(requestPermission).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("unsubscribes from Web Push and notifies /api-push/unsubscribe", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);

    const unsubsMock = vi.fn().mockResolvedValue(true);
    const mockSub = {
      endpoint: "https://fcm.googleapis.com/test",
      unsubscribe: unsubsMock,
    };

    vi.stubGlobal("Notification", { permission: "granted" });
    Reflect.set(window, "PushManager", class {});
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSub),
          },
        }),
      },
      configurable: true,
    });

    const ok = await unsubscribeWebPush();
    expect(ok).toBe(true);
    expect(unsubsMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api-push/unsubscribe",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("handles subscribeWebPush failure branches", async () => {
    // Not supported
    expect(await subscribeWebPush("1DP1", "lv")).toBeNull();

    // Permission denied
    vi.stubGlobal("Notification", {
      permission: "denied",
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });
    Reflect.set(window, "PushManager", class {});
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve({ pushManager: {} }) },
      configurable: true,
    });
    expect(await subscribeWebPush("1DP1", "lv")).toBeNull();

    // Missing keys
    const mockSubWithoutKeys = {
      endpoint: "https://fcm.googleapis.com/test",
      toJSON: () => ({ keys: {} }),
    };
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSubWithoutKeys),
          },
        }),
      },
      configurable: true,
    });
    vi.stubGlobal("Notification", { permission: "granted" });
    expect(await subscribeWebPush("1DP1", "lv")).toBeNull();

    // Fetch rejection
    const mockSub = {
      endpoint: "https://fcm.googleapis.com/test",
      toJSON: () => ({ keys: { p256dh: "key", auth: "auth" } }),
    };
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSub),
          },
        }),
      },
      configurable: true,
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network fail")));
    expect(await subscribeWebPush("1DP1", "lv")).toBeNull();
  });

  it("handles unsubscribeWebPush failure and edge branches", async () => {
    // Not supported
    expect(await unsubscribeWebPush()).toBe(false);

    // No subscription exists
    vi.stubGlobal("Notification", { permission: "granted" });
    Reflect.set(window, "PushManager", class {});
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
          },
        }),
      },
      configurable: true,
    });
    expect(await unsubscribeWebPush()).toBe(true);

    // ServiceWorker error
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.reject(new Error("SW error")),
      },
      configurable: true,
    });
    expect(await unsubscribeWebPush()).toBe(false);
  });

  it("reports substitution change to server with cooldown", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);

    // Empty dates does nothing
    await reportSubstitutionChangeToServer([]);
    expect(fetchMock).not.toHaveBeenCalled();

    await reportSubstitutionChangeToServer(["2026-09-15"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api-push/check",
      expect.objectContaining({ method: "POST" }),
    );

    // Immediate second call should be ignored by cooldown
    fetchMock.mockClear();
    await reportSubstitutionChangeToServer(["2026-09-15"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
