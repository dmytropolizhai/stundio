/**
 * Core substitution checking and Web Push dispatching engine.
 *
 * Scrapes EduPage substitutions HTML for today/tomorrow, diffs each class
 * section against last-stored hash in PUSH_KV, and dispatches encrypted Web Push
 * notifications to subscribed devices.
 */
import { buildPushPayload } from "@block65/webcrypto-web-push";
import {
  DEFAULT_VAPID_PRIVATE_KEY,
  DEFAULT_VAPID_PUBLIC_KEY,
  DEFAULT_VAPID_SUBJECT,
  sha256Hex,
  type PushEnv,
  type PushSubscriptionPayload,
} from "./types.ts";

export type ClassSubstitutionSummary = {
  className: string;
  hash: string;
  rowCount: number;
};

const USER_AGENT = "rvt-stunda/0.1 (+https://polizhai.site; personal timetable app)";

export const getTargetDates = (refDate: Date = new Date()): string[] => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Riga",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = formatter.format(refDate);
  const tomorrow = formatter.format(new Date(refDate.getTime() + 24 * 3600 * 1000));
  const dayAfter = formatter.format(new Date(refDate.getTime() + 48 * 3600 * 1000));
  return Array.from(new Set([today, tomorrow, dayAfter])).sort();
};

export const extractClassSubstitutions = async (
  html: string,
): Promise<Map<string, ClassSubstitutionSummary>> => {
  const result = new Map<string, ClassSubstitutionSummary>();
  const sections = html.split(/<div class="section[^>]*>/);

  for (const sec of sections.slice(1)) {
    const headerMatch = /<div class="header"[^>]*>[\s\S]*?>\s*([A-Za-z0-9/-]+)\s*<\/span>/.exec(
      sec,
    );
    if (!headerMatch?.[1]) continue;
    const className = headerMatch[1].trim();

    const rows = [...sec.matchAll(/<div class="row[^>]*>[\s\S]*?<\/div>\s*<\/div>/g)];
    const rowCount = rows.length;
    const hash = await sha256Hex(sec.trim());

    result.set(className, {
      className,
      hash,
      rowCount,
    });
  }

  return result;
};

export const fetchEdupageSubstitutionsHtml = async (
  date: string,
  subdomain = "pikcrvt",
): Promise<string | null> => {
  const url = `https://${subdomain}.edupage.org/substitution/server/viewer.js?__func=getSubstViewerDayDataHtml`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: `https://${subdomain}.edupage.org/substitution/`,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        __args: [null, { date, mode: "classes" }],
        __gsh: "00000000",
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { r?: unknown; e?: unknown };
    if (typeof data.r === "string") {
      return data.r;
    }
    return null;
  } catch {
    return null;
  }
};

const formatNotification = (
  className: string,
  date: string,
  rowCount: number,
  lang: string,
): { title: string; body: string } => {
  switch (lang) {
    case "en":
      return {
        title: `Schedule changes — ${className}`,
        body: `Changes on ${date} (${rowCount} ${rowCount === 1 ? "lesson" : "lessons"}).`,
      };
    case "ru":
      return {
        title: `Изменения в расписании — ${className}`,
        body: `Изменения на ${date} (${rowCount} ${rowCount === 1 ? "урок" : "уроков"}).`,
      };
    case "ua":
      return {
        title: `Зміни в розкладі — ${className}`,
        body: `Зміни на ${date} (${rowCount} ${rowCount === 1 ? "урок" : "уроків"}).`,
      };
    case "lv":
    default:
      return {
        title: `Stundu izmaiņas — ${className}`,
        body: `Izmaiņas ${date} sarakstā (${rowCount} ${rowCount === 1 ? "stunda" : "stundas"}).`,
      };
  }
};

export const sendWebPush = async (
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; date: string; url?: string },
  vapid: { subject: string; publicKey: string; privateKey: string },
): Promise<{ status: number; ok: boolean; expired?: boolean }> => {
  try {
    const push = await buildPushPayload(
      { data: JSON.stringify(payload), options: { ttl: 86400 } },
      { ...sub, expirationTime: null },
      vapid,
    );
    const res = await fetch(sub.endpoint, {
      method: push.method,
      headers: push.headers,
      body: push.body,
    });
    if (res.status === 404 || res.status === 410) {
      return { status: res.status, ok: false, expired: true };
    }
    return { status: res.status, ok: res.ok };
  } catch {
    return { status: 500, ok: false };
  }
};

export type CheckResult = {
  checkedDates: string[];
  changedClasses: string[];
  notifiedDevices: number;
  expiredDevicesRemoved: number;
  errors: string[];
};

export const checkAndDispatchSubstitutions = async (
  env: PushEnv,
  datesToScan?: string[],
): Promise<CheckResult> => {
  const result: CheckResult = {
    checkedDates: [],
    changedClasses: [],
    notifiedDevices: 0,
    expiredDevicesRemoved: 0,
    errors: [],
  };

  if (!env.PUSH_KV) {
    result.errors.push("PUSH_KV binding is missing");
    return result;
  }

  const vapid = {
    subject: env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY,
  };

  const dates = datesToScan && datesToScan.length > 0 ? datesToScan : getTargetDates();
  result.checkedDates = dates;

  for (const date of dates) {
    const html = await fetchEdupageSubstitutionsHtml(date);
    if (!html) continue;

    const classSummaries = await extractClassSubstitutions(html);

    for (const [className, summary] of classSummaries.entries()) {
      const stateKey = `state:pikcrvt:${date}:${className}`;
      const previousHash = (await env.PUSH_KV.get(stateKey, "text")) as string | null;

      if (previousHash !== summary.hash) {
        // Change detected!
        result.changedClasses.push(`${className}@${date}`);
        await env.PUSH_KV.put(stateKey, summary.hash, { expirationTtl: 86400 * 7 });

        // Only send push if there were previous substitutions or new ones have rows
        if (summary.rowCount > 0) {
          const prefix = `class:${className}:`;
          const subsList = await env.PUSH_KV.list({ prefix });

          for (const keyItem of subsList.keys) {
            const rawSub = keyItem.metadata ?? (await env.PUSH_KV.get(keyItem.name, "json"));
            const sub =
              typeof rawSub === "object" && rawSub !== null
                ? (rawSub as PushSubscriptionPayload)
                : null;
            if (!sub?.endpoint || !sub.keys) continue;

            const { title, body } = formatNotification(
              className,
              date,
              summary.rowCount,
              sub.lang || "lv",
            );

            const pushOutcome = await sendWebPush(
              sub,
              {
                title,
                body,
                date,
                url: `/?tab=day&date=${date}`,
              },
              vapid,
            );

            if (pushOutcome.ok) {
              result.notifiedDevices += 1;
            } else if (pushOutcome.expired) {
              // Clean up dead subscription
              const endpointId = await sha256Hex(sub.endpoint);
              await Promise.all([
                env.PUSH_KV.delete(`sub:${endpointId}`),
                env.PUSH_KV.delete(keyItem.name),
              ]);
              result.expiredDevicesRemoved += 1;
            }
          }
        }
      }
    }
  }

  return result;
};
