/**
 * Cloudflare Pages Function: POST /api-push/subscribe
 * Registers or updates a client Web Push subscription in PUSH_KV.
 */
import {
  corsHeaders,
  jsonResponse,
  sha256Hex,
  type EventContext,
  type PushSubscriptionPayload,
} from "./types.ts";

export const onRequestOptions = (): Response => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequest = async (context: EventContext): Promise<Response> => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return onRequestOptions();
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!env.PUSH_KV) {
    return jsonResponse({ error: "PUSH_KV binding is not configured" }, 503);
  }

  let body: Partial<PushSubscriptionPayload>;
  try {
    body = (await request.json()) as Partial<PushSubscriptionPayload>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { endpoint, keys, classId, lang } = body;

  if (!endpoint || typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return jsonResponse({ error: "Invalid endpoint: must be https URL" }, 400);
  }

  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") {
    return jsonResponse({ error: "Invalid keys: p256dh and auth are required" }, 400);
  }

  if (!classId || typeof classId !== "string") {
    return jsonResponse({ error: "classId is required" }, 400);
  }

  const normalizedLang = lang && typeof lang === "string" ? lang : "lv";
  const id = await sha256Hex(endpoint);
  const record: PushSubscriptionPayload = {
    endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    classId: classId.trim(),
    lang: normalizedLang,
    updatedAt: Date.now(),
  };

  // Check if class changed from previous registration
  const prev = (await env.PUSH_KV.get(`sub:${id}`, "json")) as PushSubscriptionPayload | null;
  if (prev?.classId && prev.classId !== record.classId) {
    await env.PUSH_KV.delete(`class:${prev.classId}:${id}`);
  }

  // 90 days TTL (7,776,000 seconds)
  const expirationTtl = 7776000;
  await Promise.all([
    env.PUSH_KV.put(`sub:${id}`, JSON.stringify(record), { expirationTtl }),
    env.PUSH_KV.put(`class:${record.classId}:${id}`, JSON.stringify(record), {
      expirationTtl,
      metadata: record,
    }),
  ]);

  return jsonResponse({ ok: true, id, classId: record.classId });
};
