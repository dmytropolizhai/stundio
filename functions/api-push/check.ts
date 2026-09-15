/**
 * Cloudflare Pages Function: POST /api-push/check
 * Client-triggered endpoint when an active app detects a change during sync.
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

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let dates: string[] | undefined;
  try {
    const body = (await request.json()) as { changedDates?: string[] };
    if (Array.isArray(body?.changedDates) && body.changedDates.length > 0) {
      dates = body.changedDates.filter(
        (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d),
      );
    }
  } catch {
    // Body is optional
  }

  const result = await checkAndDispatchSubstitutions(env, dates);
  return jsonResponse({ ok: true, ...result });
};
