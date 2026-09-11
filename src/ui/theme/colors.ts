/**
 * Subject and status colour handling, expressed in design-system terms.
 *
 * EduPage gives each subject a hex colour ("#14C030"). The Studio DS does not use it: it defines
 * exactly six flat subject accents, each shipped with its own dark ink pair so text on it clears
 * 4.5:1, and requires that a subject keep the same colour everywhere in the app. An arbitrary
 * school-supplied hex satisfies neither guarantee, so the hex is dropped and each subject is
 * assigned one of the six deterministically instead.
 */
import type { ResolvedStatus, SubjectRef } from "../../lib/edupage/index.ts";
import type { BadgeProps, LessonStatus, LessonTone } from "../../ds/index.ts";

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
 * A subject's accent.
 *
 * Keyed on `short` (the subject code) rather than `id`, because the code is what survives a
 * weekly republish — EduPage is free to renumber ids, and a subject changing colour mid-term is
 * exactly what the DS rule forbids.
 */
export const subjectTone = (subject: SubjectRef | null): SubjectTone => {
  const key = (subject?.short ?? subject?.name ?? subject?.id ?? "").trim().toLowerCase();
  if (key === "") return "sky";
  return SUBJECT_TONES[hash(key) % SUBJECT_TONES.length] ?? "sky";
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
