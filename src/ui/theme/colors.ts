/**
 * Subject and status colour handling, expressed in design-system terms.
 *
 * EduPage gives each subject a hex colour ("#14C030"). The Studio DS does not use it: it defines
 * exactly six flat subject accents, each shipped with its own dark ink pair so text on it clears
 * 4.5:1, and requires that a subject keep the same colour everywhere in the app. An arbitrary
 * school-supplied hex satisfies neither guarantee, so the hex is dropped and each subject is
 * assigned one of the six deterministically instead.
 */
import {
  isMainBuilding,
  type Building,
  type ResolvedDay,
  type ResolvedLesson,
  type ResolvedStatus,
  type SubjectRef,
} from "@/lib/edupage";
import { isHexColor, readableInk, type BadgeProps, type LessonStatus, type LessonTone } from "@/ds";

/** The six subject accents, in DS order. `brand` is reserved for "now" and is not assignable. */
export const SUBJECT_TONES = ["amber", "sky", "lilac", "pink", "mint", "lime"] as const;

export type SubjectTone = (typeof SUBJECT_TONES)[number];

/**
 * FNV-1a. Any stable hash would do; what matters is that it is pure and version-independent, so
 * the same subject lands on the same accent on every device and after every timetable republish.
 */
const hash = (value: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
};

/**
 * The stable key a subject is hashed (or overridden) on.
 *
 * `short` (the subject code) rather than `id`, because the code is what survives a weekly
 * republish — EduPage is free to renumber ids, and a subject changing colour mid-term is exactly
 * what the DS rule forbids.
 */
export const subjectToneKey = (subject: SubjectRef | null): string =>
  (subject?.short ?? subject?.name ?? subject?.id ?? "").trim().toLowerCase();

/**
 * The tone every subject renders as once colour-coding is switched off
 * (`Settings.subjectColorCodingEnabled`). Not a new value outside the DS's six — just the same
 * one already used as the hashing fallback for a subject-less lesson, so "off" reads as "every
 * lesson looks like the empty-subject case" rather than introducing a seventh colour to reason
 * about.
 */
const NEUTRAL_TONE: SubjectTone = "sky";

/**
 * A subject's *tone*: a user-chosen override first, the deterministic hash otherwise — unless
 * colour-coding is off, in which case every subject collapses to `NEUTRAL_TONE` and the hash and
 * `overrides` are never consulted. The hashing scheme stays the deterministic default either way
 * (DESIGN RULES): `enabled` and `overrides` are opt-in layers on top of it, never a replacement.
 *
 * `overrides` (`Settings.subjectColorOverrides`) maps a key to one of the six DS tones *or* a
 * user-picked `#rrggbb` hex; a hex override still falls through to the deterministic tone here,
 * because this function only ever returns one of the six — call `subjectAccent` for the version
 * that actually carries the custom colour through.
 */
export const subjectTone = (
  subject: SubjectRef | null,
  overrides: Record<string, string> = {},
  enabled = true,
): SubjectTone => {
  if (!enabled) return NEUTRAL_TONE;
  const key = subjectToneKey(subject);
  if (key === "") return NEUTRAL_TONE;
  const override = overrides[key];
  if (override !== undefined && !isHexColor(override)) return override as SubjectTone;
  return SUBJECT_TONES[hash(key) % SUBJECT_TONES.length] ?? NEUTRAL_TONE;
};

/**
 * A subject's full visual accent: one of the six DS tones (their own pre-shipped, contrast-
 * checked ink pair), or — when the override is a user-picked hex from the `ColorWheel` — that
 * exact colour paired with a readable ink computed on the fly (`ds/lib/color.ts`'s
 * `readableInk`). This is the "auto text colour" trade-off from the product decision to allow
 * arbitrary RGB per subject: unlike the six fixed tones, a wild pick is not guaranteed 4.5:1.
 *
 * Every render call site (`Card`, `LessonCard`, `WeekGrid`, the shared week image) takes this
 * over `subjectTone` alone so a custom colour actually reaches the screen instead of silently
 * falling back to a DS tone class that doesn't exist for it.
 */
export type SubjectAccent = { tone: SubjectTone } | { tone: "custom"; fill: string; ink: string };

export const subjectAccent = (
  subject: SubjectRef | null,
  overrides: Record<string, string> = {},
  enabled = true,
): SubjectAccent => {
  if (!enabled) return { tone: NEUTRAL_TONE };
  const key = subjectToneKey(subject);
  if (key === "") return { tone: NEUTRAL_TONE };
  const override = overrides[key];
  if (override !== undefined && isHexColor(override)) {
    return { tone: "custom", fill: override, ink: readableInk(override) };
  }
  return { tone: subjectTone(subject, overrides, enabled) };
};

/*
 * Words that carry no identity in a Latvian subject title, plus the Roman numerals RVT uses to
 * number course parts ("Latviešu valoda I") — an acronym of "L-V-I" says less than "LVL".
 */
const STOPWORDS = new Set(["un", "vai", "ar", "par", "uz", "i", "ii", "iii", "iv"]);

/**
 * The short code the week grid puts in a cell.
 *
 * The design system assumes a fixed 3-letter code per subject (PRG, DTB, MAT). RVT does not
 * publish one: `subject.short` comes back as a copy of the full name, so rendering it raw fills
 * a 40px cell with "Tehnoloģiju un inovāciju centrs Dārzciema ielā" truncated to "Tehno…", and
 * every cell in a column looks alike. This derives an acronym from the significant words instead,
 * which lands on the abbreviations these subjects actually go by — IKT, TIC, LVL.
 *
 * A genuinely short `short` is trusted as-is, so this costs nothing if the school ever fills it in.
 */
export const subjectCode = (subject: SubjectRef | null): string => {
  const short = (subject?.short ?? "").trim();
  if (short !== "" && short.length <= 5) return short.toUpperCase();

  const source = (subject?.name ?? "").trim() === "" ? short : (subject?.name ?? "").trim();
  if (source === "") return "—";

  const words = source
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w.toLowerCase()));

  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase();
  }
  return source.slice(0, 3).toUpperCase();
};

/**
 * RVT sometimes sends a whole class day at another building as a single "lesson" whose subject
 * is literally that building's street address. `resolveDayAcross` drops those pointers as soon
 * as the building holding the real lessons is cached; this covers the case where it is not
 * (offline, first run) and the address row is still all the user has.
 */
const TIC_ANNEX_ADDRESS = "Tehnoloģiju un inovāciju centrs Dārzciema ielā";

/**
 * The building to show on a lesson, or `undefined` when saying it would add nothing.
 *
 * Automatic building mode merges a day from every building that published it (MODEL.md §3), so
 * the answer is per-lesson: `lesson.building` first, the day's primary building as the fallback
 * for anything the merge did not tag. A day that mixes buildings labels *every* lesson — on a
 * day with travel in it, "which of these is the one in the other building" is the question.
 */
export const lessonBuilding = (
  day: Pick<ResolvedDay, "building" | "buildings">,
  lesson: Pick<ResolvedLesson, "building" | "subject">,
): string | undefined => {
  const building = lesson.building ?? day.building;
  if (day.buildings.length > 1) return building;
  if (!isMainBuilding(building)) return building;

  const name = (lesson.subject?.name ?? lesson.subject?.short ?? "").trim();
  return name === TIC_ANNEX_ADDRESS ? "TIC" : undefined;
};

/**
 * The buildings a day should be announced with, or `null` when it is an ordinary main-building
 * day. A mixed day returns all of them in lesson order, because the travel between them is the
 * part worth knowing before leaving home.
 */
export const buildingNotice = (day: Pick<ResolvedDay, "buildings">): Building[] | null => {
  if (day.buildings.length > 1) return [...day.buildings];
  const only = day.buildings[0];
  return only === undefined || isMainBuilding(only) ? null : [only];
};

/**
 * Domain status → DS `Badge` tone.
 *
 * Status colour is reserved in this system, so each of the five changes gets a distinguishable
 * tone rather than a shared "something changed" grey — except `room_change`, which is deliberately
 * the exception: `brand` is the "now" ring's own colour, and reusing it here made a room swap read
 * as urgent as the current lesson at a glance. A room change is the mildest substitution (nothing
 * moved, nothing was cancelled), so it gets the system's one muted tone instead — small and quiet,
 * with the room itself (and the school's own note) one tap away in the lesson sheet.
 */
export const STATUS_TONE: Record<
  Exclude<ResolvedStatus, "normal">,
  NonNullable<BadgeProps["tone"]>
> = {
  cancelled: "danger",
  moved: "ink",
  substituted: "warning",
  room_change: "quiet",
  added: "success",
};

/**
 * Domain status → the small corner dot's fill.
 *
 * The day list no longer spells the change out on the card face — a dot says "this changed,
 * open it," and the exact word (plus the diff itself) lives one tap away in the lesson sheet.
 * The five colours still track `STATUS_TONE`, with one deliberate substitution: the `ink` badge
 * tone is a fixed near-black meant to sit *under* white text, so as a bare fill on a dark-theme
 * card it nearly vanishes into the card itself. `moved` uses `bg-strong` instead — the same
 * "strongest ink available" alias body text is set in, which is exactly why it's guaranteed to
 * clear the card in both themes.
 */
export const STATUS_DOT_CLASS: Record<Exclude<ResolvedStatus, "normal">, string> = {
  cancelled: "bg-danger",
  moved: "bg-strong",
  substituted: "bg-warning",
  room_change: "bg-ink-500",
  added: "bg-success",
};

/**
 * Domain status → DS `LessonCard` visual treatment.
 *
 * The card has four treatments and the domain has six statuses; this is the lossy half of that
 * mapping, and it is deliberately only about *appearance*. The precise word still reaches the
 * card through its `badge` slot, so nothing is actually lost on screen.
 */
export const STATUS_TREATMENT: Record<ResolvedStatus, LessonStatus> = {
  normal: "normal",
  cancelled: "cancelled",
  moved: "substitute",
  substituted: "substitute",
  room_change: "substitute",
  added: "substitute",
};

export const isChanged = (status: ResolvedStatus): status is Exclude<ResolvedStatus, "normal"> =>
  status !== "normal";

export type { LessonTone };
