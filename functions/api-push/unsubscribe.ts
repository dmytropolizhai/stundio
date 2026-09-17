/**
 * Cloudflare Pages Function: POST /api-push/unsubscribe
 * Removes a client Web Push subscription from PUSH_KV.
 */
import {
  corsHeaders,
  jsonResponse,
  sha256Hex,
  subscriptionClass,
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

  let body: { endpoint?: string };
  try {
    body = (await request.json()) as { endpoint?: string };
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { endpoint } = body;
  if (!endpoint || typeof endpoint !== "string") {
    return jsonResponse({ error: "endpoint is required" }, 400);
  }

  const id = await sha256Hex(endpoint);
  const prev = (await env.PUSH_KV.get(`sub:${id}`, "json")) as PushSubscriptionPayload | null;

  const deletions: Promise<void>[] = [env.PUSH_KV.delete(`sub:${id}`)];
  const previousClass = subscriptionClass(prev);
  if (previousClass !== null) {
    deletions.push(env.PUSH_KV.delete(`class:${previousClass}:${id}`));
  }

  await Promise.all(deletions);

  return jsonResponse({ ok: true, id });
};
