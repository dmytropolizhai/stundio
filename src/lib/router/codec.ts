/**
 * Pure URL ↔ `AppRoute` codec and `PersonaSubject` → `AppRoute` projection.
 *
 * Route segments are registered in a small table so adding a new route kind is additive
 * rather than branching through ad-hoc string checks.
 */
import type { PersonaSubject } from "@/lib/persona";
import { toSlug, toTeacherSlug } from "./slug.ts";
import type { AppRoute } from "./types.ts";

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

/**
 * Parses a URL pathname into an `AppRoute`.
 * Recognises `/class/:slug` and `/teacher/:slug`; anything else falls back to `{ kind: "root" }`.
 */
export const parseRoute = (pathname: string): AppRoute => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return { kind: "root" };
  const [segment, rawSlug] = parts;
  if (segment === undefined || rawSlug === undefined || !isSegmentKind(segment)) {
    return { kind: "root" };
  }
  const slug = toSlug(safeDecode(rawSlug));
  if (slug === "") return { kind: "root" };
  return { kind: segment, slug };
};

/** Formats an `AppRoute` into its canonical pathname. */
export const formatRoute = (route: AppRoute): string => {
  switch (route.kind) {
    case "root":
      return "/";
    case "class":
      return `/class/${route.slug}`;
    case "teacher":
      return `/teacher/${route.slug}`;
  }
};

/** Derives the canonical `AppRoute` for the currently active `PersonaSubject`. */
export const routeFromSubject = (subject: PersonaSubject | null): AppRoute => {
  if (subject === null) return { kind: "root" };
  if (subject.persona === "teacher") {
    const label = subject.teacher.label;
    if (label === null) return { kind: "root" };
    const slug = toTeacherSlug(label);
    return slug === "" ? { kind: "root" } : { kind: "teacher", slug };
  }
  const label = subject.class.label;
  if (label === null) return { kind: "root" };
  const slug = toSlug(label);
  return slug === "" ? { kind: "root" } : { kind: "class", slug };
};
