/**
 * Pure URL ↔ `AppRoute` codec and `PersonaSubject` → `AppRoute` projection.
 *
 * Supports:
 * - `/class/:slug`, `/class/:slug/week`, `/class/:slug/week/:YYYY-MM-DD`
 * - `/teacher/:slug`, `/teacher/:slug/week`, `/teacher/:slug/week/:YYYY-MM-DD`
 */
import type { ISODate } from "@/lib/edupage";
import type { PersonaSubject } from "@/lib/persona";
import { toSlug, toTeacherSlug } from "./slug.ts";
import type { AppRoute, RouteView } from "./types.ts";

/** Canonical public origin used for shareable timetable URLs. */
export const PUBLIC_APP_ORIGIN = "https://app.stundio.lv";

const SEGMENT_KINDS = ["class", "teacher"] as const;
type SegmentKind = (typeof SEGMENT_KINDS)[number];

const isSegmentKind = (value: string): value is SegmentKind =>
  (SEGMENT_KINDS as readonly string[]).includes(value);

const safeDecode = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Validates that `value` is a real `YYYY-MM-DD` calendar date (rejects e.g. `2026-02-31`). */
const isValidIsoDate = (value: string): value is ISODate => {
  const match = ISO_DATE_RE.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
};

/**
 * Parses a URL pathname into an `AppRoute`.
 * Recognises `/(class|teacher)/:slug[/week[/:YYYY-MM-DD]]`; anything else falls back to `{ kind: "root" }`.
 */
export const parseRoute = (pathname: string): AppRoute => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return { kind: "root" };

  const [segment, rawSlug, subView, rawDate] = parts;
  if (segment === undefined || rawSlug === undefined || !isSegmentKind(segment)) {
    return { kind: "root" };
  }

  const slug = toSlug(safeDecode(rawSlug));
  if (slug === "") return { kind: "root" };

  if (parts.length === 2) return { kind: segment, slug };
  if (subView !== "week") return { kind: "root" };

  if (rawDate !== undefined && isValidIsoDate(rawDate)) {
    return { kind: segment, slug, view: "week", date: rawDate };
  }
  return { kind: segment, slug, view: "week" };
};

/** Formats an `AppRoute` into its canonical pathname. */
export const formatRoute = (route: AppRoute): string => {
  switch (route.kind) {
    case "root":
      return "/";
    case "class":
    case "teacher": {
      const base = `/${route.kind}/${route.slug}`;
      if (route.view !== "week") return base;
      return route.date === undefined ? `${base}/week` : `${base}/week/${route.date}`;
    }
  }
};

export type RouteProjectionOptions = {
  view?: RouteView;
  date?: ISODate;
};

/** Derives the canonical `AppRoute` for the currently active `PersonaSubject`. */
export const routeFromSubject = (
  subject: PersonaSubject | null,
  options?: RouteProjectionOptions,
): AppRoute => {
  if (subject === null) return { kind: "root" };

  const extra =
    options?.view === "week"
      ? options.date === undefined
        ? { view: "week" as const }
        : { view: "week" as const, date: options.date }
      : {};

  if (subject.persona === "teacher") {
    const label = subject.teacher.label;
    if (label === null) return { kind: "root" };
    const slug = toTeacherSlug(label);
    return slug === "" ? { kind: "root" } : { kind: "teacher", slug, ...extra };
  }
  const label = subject.class.label;
  if (label === null) return { kind: "root" };
  const slug = toSlug(label);
  return slug === "" ? { kind: "root" } : { kind: "class", slug, ...extra };
};

/** Builds a full shareable URL for a route (e.g. `https://app.stundio.lv/class/dp2-1/week/2026-09-07`). */
export const buildShareUrl = (route: AppRoute, origin: string = PUBLIC_APP_ORIGIN): string =>
  `${origin.replace(/\/+$/, "")}${formatRoute(route)}`;
