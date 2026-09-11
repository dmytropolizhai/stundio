/**
 * Subject and status colour handling, expressed in design-system terms.
 *
 * EduPage gives each subject a hex colour ("#14C030"). The Studio DS does not use it: it defines
 * exactly six flat subject accents, each shipped with its own dark ink pair so text on it clears
 * 4.5:1, and requires that a subject keep the same colour everywhere in the app. An arbitrary
 * school-supplied hex satisfies neither guarantee, so the hex is dropped and each subject is
 * assigned one of the six deterministically instead.
 */
import type { Building, ResolvedStatus, SubjectRef } from "../../lib/edupage/index.ts";
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

/** The same normalisation `subjectTone` and `classSubjectTones` key a subject by. */
const subjectKey = (subject: SubjectRef | null): string =>
  (subject?.short ?? subject?.name ?? subject?.id ?? "").trim().toLowerCase();

/**
 * A subject's accent.
 *
 * Keyed on `short` (the subject code) rather than `id`, because the code is what survives a
 * weekly republish — EduPage is free to renumber ids, and a subject changing colour mid-term is
 * exactly what the DS rule forbids.
 *
 * `tones`, when given, is a collision-aware map built by `classSubjectTones` for the class this
 * subject belongs to — pass it whenever the caller has that context so two subjects in the same
 * timetable never land on the same accent by hash coincidence. Every caller in the app does; the
 * plain hash stays the fallback for a subject seen with no class context (and for any subject
 * past the sixth in `tones`, or one the map was built without).
 */
export const subjectTone = (
  subject: SubjectRef | null,
  tones?: ReadonlyMap<string, SubjectTone>,
): SubjectTone => {
  const key = subjectKey(subject);
  if (key === "") return "sky";
  const assigned = tones?.get(key);
  if (assigned !== undefined) return assigned;
  return SUBJECT_TONES[hash(key) % SUBJECT_TONES.length] ?? "sky";
};

/**
 * Collision-aware accent assignment for one class's own subject list.
 *
 * The plain hash in `subjectTone` guarantees nothing about a specific timetable: a class with
 * more than six subjects (the common case — A1-1 has eight) is guaranteed at least one collision,
 * which breaks the Index Rule's promise that a subject is recognisable at a glance. This instead
 * sorts the class's *distinct* subjects by their normalised key — never by fetch order, object key
 * order, or `id` (ids are free to be renumbered on a weekly republish) — and hands out the six DS
 * accents in that fixed order, so the same class produces the same colours on every device and
 * every launch. A seventh-plus subject falls back to the hash, which can collide — the DS only
 * ships six accents, so past six a collision is unavoidable, not a bug.
 */
export const classSubjectTones = (subjects: readonly SubjectRef[]): Map<string, SubjectTone> => {
  const byKey = new Map<string, SubjectRef>();
  for (const subject of subjects) {
    const key = subjectKey(subject);
    if (key !== "" && !byKey.has(key)) byKey.set(key, subject);
  }

  const sortedKeys = [...byKey.keys()].sort();
  const tones = new Map<string, SubjectTone>();
  sortedKeys.forEach((key, index) => {
    tones.set(
      key,
      index < SUBJECT_TONES.length
        ? (SUBJECT_TONES[index] ?? "sky")
        : (SUBJECT_TONES[hash(key) % SUBJECT_TONES.length] ?? "sky"),
    );
  });
  return tones;
};

/** `bg-{tone} text-{tone}-ink` for painting a filled surface (chip, legend swatch) by tone. */
export const TONE_FILL: Record<SubjectTone, string> = {
  amber: "bg-amber text-amber-ink",
  sky: "bg-sky text-sky-ink",
  lilac: "bg-lilac text-lilac-ink",
  pink: "bg-pink text-pink-ink",
  mint: "bg-mint text-mint-ink",
  lime: "bg-lime text-lime-ink",
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
 * True when a "subject" is really a building, not a lesson topic.
 *
 * RVT's data occasionally schedules a period against the building itself ("Tehnoloģiju un
 * inovāciju centrs Dārzciema ielā", i.e. the TIC annex) rather than a real subject — it still
 * occupies a real period on the timetable, so the day/week views keep showing it, but it has no
 * business in a subject index next to an accent and a (necessarily empty) teacher list.
 *
 * Detected generically rather than by matching RVT's own string: a subject counts as a building
 * artifact when its derived short code (`subjectCode`) matches the building code of the
 * timetable it came from — the same signal `CLAUDE.md`/`MODEL.md` use to pick a timetable by
 * building, so this needs no school-specific literal to work on a different school's data.
 */
export const isBuildingArtifact = (
  subject: SubjectRef | null,
  building: Building | null,
): boolean => building !== null && subjectCode(subject).toUpperCase() === building.toUpperCase();

/**
 * Domain status → DS `Badge` tone.
 *
 * Status colour is reserved in this system, so each of the five changes gets a distinguishable
 * tone rather than a shared "something changed" grey.
 */
export const STATUS_TONE: Record<
  Exclude<ResolvedStatus, "normal">,
  NonNullable<BadgeProps["tone"]>
> = {
  cancelled: "danger",
  moved: "ink",
  substituted: "warning",
  room_change: "brand",
  added: "success",
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
