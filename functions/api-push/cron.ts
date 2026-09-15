/**
 * Cloudflare Pages Function: POST /api-push/cron
 * Scheduled cron endpoint for checking substitutions and dispatching push notifications.
 */
import { checkAndDispatchSubstitutions } from "./checker.ts";
import { corsHeaders, jsonResponse, type EventContext } from "./types.ts";

export const onRequestOptions = (): Response => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequest = async (context: EventContext): Promise<Response> => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return onRequestOptions();
  }

  if (request.method !== "POST" && request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // If CRON_SECRET is configured, require Bearer token
  if (env.CRON_SECRET) {
    const auth = request.headers.get("Authorization");
    const expected = `Bearer ${env.CRON_SECRET}`;
    if (auth !== expected) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  const result = await checkAndDispatchSubstitutions(env);
  return jsonResponse({ ok: true, ...result });
};
