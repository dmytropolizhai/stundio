/**
 * Cloudflare Pages Function: POST /api-push/subscribe
 * Registers or updates a client Web Push subscription in PUSH_KV.
 */
import {
  corsHeaders,
  jsonResponse,
  sha256Hex,
  subscriptionIndex,
  TEACHER_KEY_HASH,
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

  const { endpoint, keys, lang } = body;
  // `classId` is what a client built before the rename sends; it holds an EduPage id that the
  // checker can never match, but accepting it keeps an un-updated PWA registering *something*.
  const className = body.className ?? body.classId;

  if (!endpoint || typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return jsonResponse({ error: "Invalid endpoint: must be https URL" }, 400);
  }

  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") {
    return jsonResponse({ error: "Invalid keys: p256dh and auth are required" }, 400);
  }

  // A teacher is filed by a hash of their name key, a student by class — exactly one of them.
  const { teacherKeyHash } = body;
  const isTeacher = teacherKeyHash !== undefined;

  if (isTeacher && (typeof teacherKeyHash !== "string" || !TEACHER_KEY_HASH.test(teacherKeyHash))) {
    return jsonResponse({ error: "teacherKeyHash must be a SHA-256 hex digest" }, 400);
  }

  if (!isTeacher && (!className || typeof className !== "string")) {
    return jsonResponse({ error: "className or teacherKeyHash is required" }, 400);
  }

  const normalizedLang = lang && typeof lang === "string" ? lang : "lv";
  const id = await sha256Hex(endpoint);
  const record: PushSubscriptionPayload = {
    endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    ...(isTeacher ? { teacherKeyHash } : { className: (className ?? "").trim() }),
    lang: normalizedLang,
    updatedAt: Date.now(),
  };
  const index = subscriptionIndex(record) ?? "";

  /*
   * Drop the old index entry when what this device is filed under changes — another class,
   * a switch between student and teacher, or the one-off move from a pre-rename id to a real
   * class short, which is how an existing installation migrates off a key nothing was ever
   * dispatched to.
   */
  const prev = (await env.PUSH_KV.get(`sub:${id}`, "json")) as PushSubscriptionPayload | null;
  const previousIndex = subscriptionIndex(prev);
  if (previousIndex !== null && previousIndex !== index) {
    await env.PUSH_KV.delete(`${previousIndex}${id}`);
  }

  // 90 days TTL (7,776,000 seconds)
  const expirationTtl = 7776000;
  await Promise.all([
    env.PUSH_KV.put(`sub:${id}`, JSON.stringify(record), { expirationTtl }),
    env.PUSH_KV.put(`${index}${id}`, JSON.stringify(record), {
      expirationTtl,
      metadata: record,
    }),
  ]);

  return jsonResponse({
    ok: true,
    id,
    ...(isTeacher ? { role: "teacher" } : { role: "student", className: record.className }),
  });
};
