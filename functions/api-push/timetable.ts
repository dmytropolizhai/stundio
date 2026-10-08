/**
 * "A new week's timetable is up" for Web Push subscribers (the Android app detects the same
 * thing on-device — `sync/engine.ts`). Form teachers wait on it to enter lessons in e-klase.
 *
 * Each run fetches the school's published-timetable list and compares its `tt_num`s with the
 * set stored in PUSH_KV. A `tt_num` is never reused (MODEL.md §6), so one the stored set lacks
 * is a freshly published week. The very first run only records a baseline — otherwise every
 * existing timetable would read as new. Everyone with a subscription is notified, class and
 * teacher alike: it is school-wide news and names no one.
 */
import { dispatchToSubscribers, vapidFromEnv, type CheckResult } from "./checker.ts";
import type { PushEnv } from "./types.ts";

const USER_AGENT = "rvt-stunda/0.1 (+https://polizhai.site; personal timetable app)";
const STATE_KEY = "state:pikcrvt:timetables";

export type PublishedTimetable = { ttNum: string; validFrom: string };

/** EduPage keys the list by school year: August onwards belongs to the new one. */
export const schoolYearOf = (refDate: Date = new Date()): number => {
  const [y, m] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Riga",
    year: "numeric",
    month: "2-digit",
  })
    .format(refDate)
    .split("-")
    .map(Number);
  return (m ?? 1) >= 8 ? (y ?? refDate.getUTCFullYear()) : (y ?? refDate.getUTCFullYear()) - 1;
};

export const fetchPublishedTimetables = async (
  year: number,
  subdomain = "pikcrvt",
): Promise<PublishedTimetable[] | null> => {
  const url = `https://${subdomain}.edupage.org/timetable/server/ttviewer.js?__func=getTTViewerData`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: `https://${subdomain}.edupage.org/timetable/`,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ __args: [null, year], __gsh: "00000000" }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      r?: {
        regular?: { timetables?: { tt_num?: unknown; datefrom?: unknown; hidden?: unknown }[] };
      };
    };
    const rows = data.r?.regular?.timetables;
    if (!Array.isArray(rows)) return null;
    return rows
      .filter((t) => !t.hidden)
      .flatMap((t) =>
        typeof t.tt_num === "string" && typeof t.datefrom === "string"
          ? [{ ttNum: t.tt_num, validFrom: t.datefrom }]
          : [],
      );
  } catch {
    return null;
  }
};

const formatDate = (iso: string): string => iso.split("-").reverse().join(".");

export const formatNewTimetable = (
  validFrom: string,
  lang: string,
): { title: string; body: string } => {
  const date = formatDate(validFrom);
  switch (lang) {
    case "en":
      return {
        title: "New timetable",
        body: `A new timetable from ${date} has been published.`,
      };
    case "ru":
      return { title: "Новое расписание", body: `Опубликовано новое расписание с ${date}.` };
    case "ua":
      return { title: "Новий розклад", body: `Опубліковано новий розклад з ${date}.` };
    case "lv":
    default:
      return {
        title: "Jauns stundu saraksts",
        body: `Izlikts jauns stundu saraksts no ${date}.`,
      };
  }
};

export type TimetableCheckResult = Pick<
  CheckResult,
  "notifiedDevices" | "expiredDevicesRemoved"
> & {
  /** `validFrom` of the earliest newly published timetable, or null. */
  newTimetableFrom: string | null;
  errors: string[];
};

export const checkAndDispatchNewTimetable = async (
  env: PushEnv,
  refDate: Date = new Date(),
): Promise<TimetableCheckResult> => {
  const result: TimetableCheckResult = {
    notifiedDevices: 0,
    expiredDevicesRemoved: 0,
    newTimetableFrom: null,
    errors: [],
  };
  const kv = env.PUSH_KV;
  if (!kv) {
    result.errors.push("PUSH_KV binding is missing");
    return result;
  }

  const published = await fetchPublishedTimetables(schoolYearOf(refDate));
  if (published === null) return result;

  // Keyed by year too: a new school year starts a fresh list rather than reading as all-new.
  const stateKey = `${STATE_KEY}:${String(schoolYearOf(refDate))}`;
  const stored = (await kv.get(stateKey, "text")) as string | null;
  await kv.put(stateKey, JSON.stringify(published.map((t) => t.ttNum)));
  if (stored === null) return result;

  let known: Set<string>;
  try {
    known = new Set(JSON.parse(stored) as string[]);
  } catch {
    return result;
  }
  const added = published
    .filter((t) => !known.has(t.ttNum))
    .map((t) => t.validFrom)
    .sort();
  const first = added[0];
  if (first === undefined) return result;
  result.newTimetableFrom = first;

  const vapid = vapidFromEnv(env);
  for (const prefix of ["class:", "teacher:"]) {
    await dispatchToSubscribers(kv, vapid, result, prefix, first, (lang) =>
      formatNewTimetable(first, lang),
    );
  }
  return result;
};
