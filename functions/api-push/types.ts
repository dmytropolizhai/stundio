/**
 * Shared types and constants for Cloudflare Pages Push Functions.
 */

export type KVNamespace = {
  get: (key: string, type?: "text" | "json" | "arrayBuffer" | "stream") => Promise<unknown>;
  put: (
    key: string,
    value: string | ReadableStream | ArrayBuffer,
    options?: { expiration?: number; expirationTtl?: number; metadata?: unknown },
  ) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: (options?: { prefix?: string; limit?: number; cursor?: string }) => Promise<{
    keys: { name: string; expiration?: number; metadata?: unknown }[];
    list_complete: boolean;
    cursor?: string;
  }>;
};

export type PushEnv = {
  PUSH_KV?: KVNamespace;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  CRON_SECRET?: string;
};

export type EventContext<Env = PushEnv> = {
  request: Request;
  params: Record<string, string | string[]>;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
};

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  /**
   * The class's DISPLAY SHORT ("1DP1") — the only name the substitution feed publishes, and so
   * the only thing a subscription can be keyed by: `checkAndDispatchSubstitutions` looks its
   * recipients up under `class:<section header>:`. This field used to carry the client's
   * `selectedClassId` ("-928") instead, which matches no section header EduPage ever renders,
   * so every change the checker found dispatched to nobody.
   */
  className?: string;
  /**
   * Teacher subscriptions only, instead of `className`: the SHA-256 hex of the teacher's
   * normalised name key (`teacherKey`, token-sorted and lowercased, so "Surname Name" and
   * "Name Surname" agree). The client hashes before sending, so no teacher's name is ever
   * stored here — the checker hashes the names it reads in the feed and compares.
   */
  teacherKeyHash?: string;
  lang: string;
  updatedAt?: number;
  /** What `className` was called while it held an id. Read-only, to migrate stored records. */
  classId?: string;
};

/** The class a stored subscription is filed under, tolerating pre-rename records. */
export const subscriptionClass = (
  record: Partial<PushSubscriptionPayload> | null | undefined,
): string | null => record?.className ?? record?.classId ?? null;

export const TEACHER_KEY_HASH = /^[0-9a-f]{64}$/;

/**
 * The KV index prefix a subscription is listed under — `class:<short>:` for a student,
 * `teacher:<hash>:` for a teacher — or `null` for a record that names neither. Both roles
 * share the `sub:<id>` record, so switching role re-files the device rather than doubling it.
 */
export const subscriptionIndex = (
  record: Partial<PushSubscriptionPayload> | null | undefined,
): string | null => {
  if (record?.teacherKeyHash !== undefined) return `teacher:${record.teacherKeyHash}:`;
  const className = subscriptionClass(record);
  return className === null ? null : `class:${className}:`;
};

export const DEFAULT_VAPID_PUBLIC_KEY =
  "BBb4nnU3LcNCjbU9tSotemIqe6m10tH5mXExCi5CO78DpOljO3e1UX1kXem2goXDcNG3z0dcqZc5K1iaTYtTuYA";
export const DEFAULT_VAPID_PRIVATE_KEY = "VNB6mNJYKzef6s9P8u2Z--WfTkaKKM8tiUvWt7V52Tk";
export const DEFAULT_VAPID_SUBJECT = "mailto:stundio@polizhai.site";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export const jsonResponse = (data: unknown, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};

export const sha256Hex = async (message: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
