import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  onRequest as onSubscribeRequest,
  onRequestOptions as onSubscribeOptions,
} from "../api-push/subscribe.ts";
import {
  onRequest as onUnsubscribeRequest,
  onRequestOptions as onUnsubscribeOptions,
} from "../api-push/unsubscribe.ts";
import { onRequest as onCronRequest, onRequestOptions as onCronOptions } from "../api-push/cron.ts";
import {
  onRequest as onCheckRequest,
  onRequestOptions as onCheckOptions,
} from "../api-push/check.ts";
import {
  extractClassSubstitutions,
  getTargetDates,
  sendWebPush,
  checkAndDispatchSubstitutions,
} from "../api-push/checker.ts";
import type { EventContext, KVNamespace, PushEnv } from "../api-push/types.ts";

const createMockKv = (initialData: Record<string, unknown> = {}): KVNamespace => {
  const store = new Map<string, unknown>(Object.entries(initialData));
  const metadataStore = new Map<string, unknown>();

  return {
    get: vi.fn((key: string, type?: string) => {
      const val = store.get(key);
      if (val === undefined) return Promise.resolve(null);
      if (type === "json") return Promise.resolve(typeof val === "string" ? JSON.parse(val) : val);
      return Promise.resolve(typeof val === "string" ? val : JSON.stringify(val));
    }),
    put: vi.fn((key: string, value: unknown, options?: { metadata?: unknown }) => {
      store.set(key, value);
      if (options?.metadata !== undefined) {
        metadataStore.set(key, options.metadata);
      }
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      metadataStore.delete(key);
      return Promise.resolve();
    }),
    list: vi.fn((options?: { prefix?: string }) => {
      const prefix = options?.prefix ?? "";
      const keys = Array.from(store.keys())
        .filter((k) => k.startsWith(prefix))
        .map((name) => ({
          name,
          metadata: metadataStore.get(name),
        }));
      return Promise.resolve({ keys, list_complete: true });
    }),
  };
};

describe("Cloudflare Pages Function: /api-push", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("subscribe", () => {
    it("handles OPTIONS preflight with status 204", () => {
      const res = onSubscribeOptions();
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("rejects non-POST methods with 405", async () => {
      const context: EventContext = {
        request: new Request("https://stundio.pages.dev/api-push/subscribe", { method: "GET" }),
        params: {},
        env: { PUSH_KV: createMockKv() },
        waitUntil: vi.fn(),
        next: vi.fn(),
      };
      const res = await onSubscribeRequest(context);
      expect(res.status).toBe(405);
    });

    it("returns 503 when PUSH_KV is not configured", async () => {
      const context: EventContext = {
        request: new Request("https://stundio.pages.dev/api-push/subscribe", {
          method: "POST",
          body: JSON.stringify({}),
        }),
        params: {},
        env: {},
        waitUntil: vi.fn(),
        next: vi.fn(),
      };
      const res = await onSubscribeRequest(context);
      expect(res.status).toBe(503);
    });

    it("returns 400 on malformed JSON", async () => {
      const context: EventContext = {
        request: new Request("https://stundio.pages.dev/api-push/subscribe", {
          method: "POST",
          body: "invalid-json",
        }),
        params: {},
        env: { PUSH_KV: createMockKv() },
        waitUntil: vi.fn(),
        next: vi.fn(),
      };
      const res = await onSubscribeRequest(context);
      expect(res.status).toBe(400);
    });

    it("validates missing or invalid endpoint", async () => {
      const context: EventContext = {
        request: new Request("https://stundio.pages.dev/api-push/subscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: "http://insecure.url" }),
        }),
        params: {},
        env: { PUSH_KV: createMockKv() },
        waitUntil: vi.fn(),
        next: vi.fn(),
      };
      const res = await onSubscribeRequest(context);
      expect(res.status).toBe(400);
    });

    it("validates missing keys and classId", async () => {
      const kv = createMockKv();
      const res1 = await onSubscribeRequest({
        request: new Request("https://stundio.pages.dev/api-push/subscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: "https://fcm.googleapis.com/test" }),
        }),
        params: {},
        env: { PUSH_KV: kv },
        waitUntil: vi.fn(),
        next: vi.fn(),
      });
      expect(res1.status).toBe(400);

      const res2 = await onSubscribeRequest({
        request: new Request("https://stundio.pages.dev/api-push/subscribe", {
          method: "POST",
          body: JSON.stringify({
            endpoint: "https://fcm.googleapis.com/test",
            keys: { p256dh: "key", auth: "auth" },
          }),
        }),
        params: {},
        env: { PUSH_KV: kv },
        waitUntil: vi.fn(),
        next: vi.fn(),
      });
      expect(res2.status).toBe(400);
    });

    it("successfully registers subscription and handles class update", async () => {
      const kv = createMockKv();
      const payload = {
        endpoint: "https://fcm.googleapis.com/test-endpoint",
        keys: { p256dh: "dummy-p256dh", auth: "dummy-auth" },
        classId: "1DP1",
        lang: "lv",
      };

      const res = await onSubscribeRequest({
        request: new Request("https://stundio.pages.dev/api-push/subscribe", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
        params: {},
        env: { PUSH_KV: kv },
        waitUntil: vi.fn(),
        next: vi.fn(),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; classId: string };
      expect(data.ok).toBe(true);
      expect(data.classId).toBe("1DP1");

      // Update class to 2DP1
      const updateRes = await onSubscribeRequest({
        request: new Request("https://stundio.pages.dev/api-push/subscribe", {
          method: "POST",
          body: JSON.stringify({ ...payload, classId: "2DP1" }),
        }),
        params: {},
        env: { PUSH_KV: kv },
        waitUntil: vi.fn(),
        next: vi.fn(),
      });

      expect(updateRes.status).toBe(200);
      expect(vi.mocked(kv.delete)).toHaveBeenCalled();
    });
  });

  describe("unsubscribe", () => {
    it("handles OPTIONS preflight with 204", () => {
      expect(onUnsubscribeOptions().status).toBe(204);
    });

    it("rejects non-POST methods with 405", async () => {
      const res = await onUnsubscribeRequest({
        request: new Request("https://stundio.pages.dev/api-push/unsubscribe", { method: "GET" }),
        params: {},
        env: { PUSH_KV: createMockKv() },
        waitUntil: vi.fn(),
        next: vi.fn(),
      });
      expect(res.status).toBe(405);
    });

    it("returns 503 if PUSH_KV is missing", async () => {
      const res = await onUnsubscribeRequest({
        request: new Request("https://stundio.pages.dev/api-push/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: "https://fcm.googleapis.com/test" }),
        }),
        params: {},
        env: {},
        waitUntil: vi.fn(),
        next: vi.fn(),
      });
      expect(res.status).toBe(503);
    });

    it("returns 400 on invalid body", async () => {
      const res = await onUnsubscribeRequest({
        request: new Request("https://stundio.pages.dev/api-push/unsubscribe", {
          method: "POST",
          body: "invalid",
        }),
        params: {},
        env: { PUSH_KV: createMockKv() },
        waitUntil: vi.fn(),
        next: vi.fn(),
      });
      expect(res.status).toBe(400);
    });

    it("successfully deletes subscription", async () => {
      const kv = createMockKv({
        "sub:123": JSON.stringify({ classId: "1DP1" }),
      });
      const res = await onUnsubscribeRequest({
        request: new Request("https://stundio.pages.dev/api-push/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ endpoint: "https://fcm.googleapis.com/test" }),
        }),
        params: {},
        env: { PUSH_KV: kv },
        waitUntil: vi.fn(),
        next: vi.fn(),
      });
      expect(res.status).toBe(200);
      expect(vi.mocked(kv.delete)).toHaveBeenCalled();
    });
  });

  describe("cron & check endpoints", () => {
    it("handles cron OPTIONS preflight with 204", () => {
      expect(onCronOptions().status).toBe(204);
    });

    it("handles check OPTIONS preflight with 204", () => {
      expect(onCheckOptions().status).toBe(204);
    });

    it("enforces CRON_SECRET when configured", async () => {
      const kv = createMockKv();
      const env: PushEnv = { PUSH_KV: kv, CRON_SECRET: "secret123" };

      const unauthed = await onCronRequest({
        request: new Request("https://stundio.pages.dev/api-push/cron", { method: "POST" }),
        params: {},
        env,
        waitUntil: vi.fn(),
        next: vi.fn(),
      });
      expect(unauthed.status).toBe(401);

      const authed = await onCronRequest({
        request: new Request("https://stundio.pages.dev/api-push/cron", {
          method: "POST",
          headers: { Authorization: "Bearer secret123" },
        }),
        params: {},
        env,
        waitUntil: vi.fn(),
        next: vi.fn(),
      });
      expect(authed.status).toBe(200);
    });

    it("handles check endpoint with optional changedDates body", async () => {
      const kv = createMockKv();
      const env: PushEnv = { PUSH_KV: kv };

      const res = await onCheckRequest({
        request: new Request("https://stundio.pages.dev/api-push/check", {
          method: "POST",
          body: JSON.stringify({ changedDates: ["2026-09-15"] }),
        }),
        params: {},
        env,
        waitUntil: vi.fn(),
        next: vi.fn(),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { ok: boolean; checkedDates: string[] };
      expect(data.ok).toBe(true);
      expect(data.checkedDates).toEqual(["2026-09-15"]);
    });
  });

  describe("checker core", () => {
    it("extracts class substitutions from HTML", async () => {
      const sampleHtml = `
        <div class="section print-nobreak">
          <div class="header"><span class="print-font-resizable">1DP1</span></div>
          <div class="rows">
            <div class="row remove"><div class="period">1</div><div class="info">Matematika - Atcelts</div></div>
          </div>
        </div>
      `;
      const summaries = await extractClassSubstitutions(sampleHtml);
      expect(summaries.has("1DP1")).toBe(true);
      expect(summaries.get("1DP1")?.rowCount).toBe(1);
    });

    it("generates target dates in Europe/Riga", () => {
      const dates = getTargetDates(new Date("2026-09-15T10:00:00Z"));
      expect(dates.length).toBe(3);
      expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("handles web push send outcome and expired subscriptions", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 410 }));
      global.fetch = fetchMock;

      const sub = {
        endpoint: "https://fcm.googleapis.com/test",
        keys: {
          p256dh:
            "BBb4nnU3LcNCjbU9tSotemIqe6m10tH5mXExCi5CO78DpOljO3e1UX1kXem2goXDcNG3z0dcqZc5K1iaTYtTuYA",
          auth: Buffer.from("1234567890123456").toString("base64url"),
        },
      };

      const outcome = await sendWebPush(
        sub,
        { title: "Test", body: "Body", date: "2026-09-15" },
        {
          subject: "mailto:admin@stundio.lv",
          publicKey:
            "BBb4nnU3LcNCjbU9tSotemIqe6m10tH5mXExCi5CO78DpOljO3e1UX1kXem2goXDcNG3z0dcqZc5K1iaTYtTuYA",
          privateKey: "VNB6mNJYKzef6s9P8u2Z--WfTkaKKM8tiUvWt7V52Tk",
        },
      );

      expect(outcome.expired).toBe(true);
      expect(outcome.ok).toBe(false);
    });

    it("reports missing PUSH_KV in checkAndDispatchSubstitutions", async () => {
      const res = await checkAndDispatchSubstitutions({});
      expect(res.errors).toContain("PUSH_KV binding is missing");
    });
  });
});
