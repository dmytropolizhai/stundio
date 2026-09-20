import type { TeacherRef } from "./types.ts";
import { teacherKey } from "./teacher-names.ts";

export type TeacherIdentifier = TeacherRef | string;

/**
 * Regex matching group suffixes in Latvian:
 * e.g. "DP2-1 grupai", "DP2-1, DP2-2 grupām", "N3 grupai", "A4-2 grupas", etc.
 */
const GROUP_SUFFIX_RE =
  /\b([-A-Za-z0-9_/]+(?:\s*(?:,|un|\/)\s*[-A-Za-z0-9_/]+)*)\s+grup(?:ai|ām|am|as|a|ā|u|ās)\b/gi;

/**
 * Regex matching leading class code followed by separator:
 * e.g. "DP2-1: 3. stunda atcelta", "DP2-1 - 3. stunda atcelta"
 */
const LEADING_CLASS_RE =
  /^([-A-Za-z0-9_/]+(?:\s*(?:,|un|\/)\s*[-A-Za-z0-9_/]+)*)(?:\s*:\s*|\s+[-–—]\s+)(.*)$/;

/**
 * Splits comma- or "un"-separated list of tokens into individual identifiers.
 */
const splitGroupList = (raw: string): string[] =>
  raw
    .split(/(?:,|\bun\b|\/)/i)
    .map((s) => s.trim())
    .filter((s) => s !== "");

/**
 * Breaks concatenated group announcements into separate entries.
 *
 * In EduPage, administrators sometimes write multiple announcements without terminal
 * punctuation (e.g. "A3-1 grupai 4-5 stunda -pašvadīti AV2-1 grupai 10-12 stundai - pašvadīti.").
 * This splits right before a new group announcement heading.
 */
export const splitGroupAnnouncements = (text: string): string[] => {
  const trimmed = text.trim();
  if (trimmed === "") return [];

  // Split before any "[GROUP] grupai/grupām" that does not appear at the very start
  const parts = trimmed
    .split(
      /(?<=\S)\s+(?=[-A-Za-z0-9_/]+(?:\s*(?:,|un|\/)\s*[-A-Za-z0-9_/]+)*\s+grup(?:ai|ām|am|as|a|ā|u|ās)\b)/iu,
    )
    .map((s) => s.trim())
    .filter((s) => s !== "");

  return parts.length > 0 ? parts : [trimmed];
};

/**
 * Extracts class/group names explicitly targeted by an announcement text.
 */
export const extractTargetGroups = (text: string, allClasses: readonly string[] = []): string[] => {
  const targets = new Set<string>();

  // 1. Check for "[GROUP(s)] grupai / grupām / etc."
  const suffixMatches = text.matchAll(GROUP_SUFFIX_RE);
  for (const match of suffixMatches) {
    const rawGroups = match[1];
    if (rawGroups !== undefined) {
      for (const group of splitGroupList(rawGroups)) {
        targets.add(group);
      }
    }
  }

  // 2. Check for leading "[GROUP]: " or "[GROUP] - " if no suffix matches found
  if (targets.size === 0) {
    const leadingMatch = LEADING_CLASS_RE.exec(text);
    if (leadingMatch?.[1] !== undefined) {
      const candidates = splitGroupList(leadingMatch[1]);
      for (const c of candidates) {
        // Accept if it matches a known class, or follows a class code shape (e.g. "DP2-1", "N3")
        if (
          allClasses.some((ac) => ac.toUpperCase() === c.toUpperCase()) ||
          /^[A-Z]{1,4}\d(?:-\d+)?$/i.test(c)
        ) {
          targets.add(c);
        }
      }
    }
  }

  // 3. If no target found yet, check if text specifically contains any known class name
  if (targets.size === 0 && allClasses.length > 0) {
    for (const cls of allClasses) {
      if (cls.length < 2) continue;
      // Exact class match with boundary
      const escaped = cls.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const re = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "i");
      if (re.test(text)) {
        targets.add(cls);
      }
    }
  }

  return [...targets];
};

/**
 * Checks whether a targeted group string matches the student's class name.
 *
 * Examples:
 * - target "DP2-1" matches class "DP2-1" (exact)
 * - target "DP2" matches class "DP2-1" (year-level prefix)
 * - target "DP" matches class "DP2-1" (programme-level prefix)
 * - target "PRT" matches class "PRT1" (programme-level prefix)
 * - target "N3" does NOT match class "DP2-1"
 * - target "DP2-2" does NOT match class "DP2-1"
 */
export const isTargetMatch = (target: string, className: string): boolean => {
  const normTarget = target.trim().toUpperCase();
  const normClass = className.trim().toUpperCase();

  if (normTarget === "" || normClass === "") return false;

  // Exact match
  if (normTarget === normClass) return true;

  // Extract year prefix (before hyphen, e.g. "DP2" from "DP2-1")
  const hyphenIndex = normClass.indexOf("-");
  const yearPrefix = hyphenIndex > 0 ? normClass.slice(0, hyphenIndex) : normClass;
  if (normTarget === yearPrefix) return true;

  // Extract programme prefix (letters before digits, e.g. "DP" from "DP2-1" or "PRT" from "PRT1")
  const progMatch = /^[A-Z]+/i.exec(normClass);
  const progPrefix = progMatch ? progMatch[0].toUpperCase() : "";
  if (progPrefix.length >= 2 && normTarget === progPrefix) return true;

  return false;
};

/**
 * Extracts name and surname tokens from a teacher label or TeacherRef.
 * Ignores 1-2 character initials (e.g. "N.", "J.").
 */
export const getTeacherTokens = (teacher: TeacherIdentifier): string[] => {
  const label = typeof teacher === "string" ? teacher : teacher.short || teacher.name || "";
  if (!label) return [];
  return label
    .split(/[\s,/]+/)
    .map((t) => t.replace(/[.,;:()]/g, "").trim())
    .filter((t) => t.length >= 3);
};

/**
 * Builds a stem for Latvian names/surnames to allow declension matching.
 * E.g. "Tiltiņš" -> "Tiltiņ", "Baumane" -> "Bauman", "Salmiņa" -> "Salmiņ",
 * "Geislers" -> "Geisler", "Sabanskis" -> "Sabansk".
 * Short words (<= 4 chars) are kept intact to avoid false positive collisions.
 */
export const buildLatvianStem = (token: string): string => {
  if (token.length <= 4) return token;
  const lower = token.toLowerCase();
  if (lower.endsWith("is")) return token.slice(0, -2);
  if (/[sšae]$/i.test(token)) {
    return token.slice(0, -1);
  }
  return token;
};

/**
 * Checks whether two teachers refer to the same person.
 */
export const areTeachersEqual = (a: TeacherIdentifier, b: TeacherIdentifier): boolean => {
  if (typeof a === "object" && typeof b === "object" && a.id && b.id && a.id === b.id) {
    return true;
  }
  const labelA = typeof a === "string" ? a : a.short || a.name || "";
  const labelB = typeof b === "string" ? b : b.short || b.name || "";
  if (labelA.trim() !== "" && labelB.trim() !== "" && teacherKey(labelA) === teacherKey(labelB)) {
    return true;
  }

  const tokensA = getTeacherTokens(a).map((t) => t.toUpperCase());
  const tokensB = getTeacherTokens(b).map((t) => t.toUpperCase());
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const setA = new Set(tokensA);
  const common = tokensB.filter((t) => setA.has(t));
  if (tokensA.length >= 2 && tokensB.length >= 2) {
    return common.length >= 2;
  }
  return common.length >= 1;
};

/**
 * Checks whether a given teacher is mentioned in the note text by name or surname.
 */
export const isTeacherMentionedInNote = (note: string, teacher: TeacherIdentifier): boolean => {
  const tokens = getTeacherTokens(teacher);
  if (tokens.length === 0) return false;

  // 1. Full name in either order (e.g. "Egija Baumane" or "Baumane Egija")
  if (tokens.length >= 2) {
    const full1 = tokens.join("[\\s,]+");
    const full2 = [...tokens].reverse().join("[\\s,]+");
    const re1 = new RegExp("(?<!\\p{L})" + full1 + "(?=[^\\p{L}]|$)", "iu");
    const re2 = new RegExp("(?<!\\p{L})" + full2 + "(?=[^\\p{L}]|$)", "iu");
    if (re1.test(note) || re2.test(note)) return true;
  }

  // 2. Title + token (e.g. "sk. Tiltiņš", "sk. N. Tiltiņš", "skolotāja Sabanska", "sk. Kalniņai")
  const titleRe = /(?:sk\.|skolotāj\p{L}*)\s+(?:[A-ZŠČĢĶĀĒĪŪŅ]\.\s*)?(\p{L}+)/giu;
  const titleMatches = [...note.matchAll(titleRe)].map((m) => m[1]);
  for (const tm of titleMatches) {
    if (!tm) continue;
    const tmStem = buildLatvianStem(tm).toLowerCase();
    for (const tok of tokens) {
      const stem = buildLatvianStem(tok).toLowerCase();
      if (
        tm.toLowerCase() === tok.toLowerCase() ||
        (stem.length >= 4 && tmStem.startsWith(stem)) ||
        (stem.length >= 4 && stem.startsWith(tmStem))
      ) {
        return true;
      }
    }
  }

  // 3. Header indicating teacher list (e.g. "Skolotāji, kuri nepiedalās:", "Skolotāji:")
  const hasTeacherList = /skolotāj\p{L}*\s*[,:]/iu.test(note);

  // 4. Token match with Latvian declension:
  for (const tok of tokens) {
    const stem = buildLatvianStem(tok);
    const stemRe =
      stem.length >= 4
        ? new RegExp("(?<!\\p{L})" + stem + "\\p{L}{0,3}(?=[^\\p{L}]|$)", "iu")
        : new RegExp("(?<!\\p{L})" + tok + "(?=[^\\p{L}]|$)", "iu");

    if (hasTeacherList && stemRe.test(note)) {
      return true;
    }

    // Standalone token followed by punctuation, number, room/cabinet, stunda, or absence keywords
    const standaloneRe = new RegExp(
      "(?<!\\p{L})" +
        (stem.length >= 4 ? stem + "\\p{L}{0,3}" : tok) +
        "(?:[.,:;–—-]\\s*|\\s+[-–—]\\s+|\\s+\\d|\\s+[A-Z]-\\d|\\s+kab|\\s+telp|\\s+zāl|\\s+korp|\\s+stund|\\s+slim|\\s+nebūs|\\s+atcelt)",
      "iu",
    );
    if (standaloneRe.test(note)) {
      return true;
    }
  }

  return false;
};

/**
 * Extracts all teachers from the provided teacher pool that are mentioned in the note.
 */
export const extractMentionedTeachers = (
  note: string,
  teachers: readonly TeacherIdentifier[],
): TeacherIdentifier[] => {
  return teachers.filter((t) => isTeacherMentionedInNote(note, t));
};

/**
 * Determines whether an individual announcement is relevant to a selected class.
 */
export const isNoteRelevantForClass = (
  note: string,
  className: string,
  allClasses: readonly string[] = [],
  classTeachers: readonly TeacherIdentifier[] = [],
  allTeachers: readonly TeacherIdentifier[] = [],
): boolean => {
  const targets = extractTargetGroups(note, allClasses);
  if (targets.length > 0) {
    return targets.some((t) => isTargetMatch(t, className));
  }

  // If no group is targeted, check if announcement targets teachers
  if (allTeachers.length > 0) {
    const mentioned = extractMentionedTeachers(note, allTeachers);
    if (mentioned.length > 0) {
      return mentioned.some((mt) => classTeachers.some((ct) => areTeachersEqual(mt, ct)));
    }
  }

  // General school announcement
  return true;
};

/**
 * Partitions daily announcements into those relevant to the selected class
 * and those targeted at other classes.
 */
export const filterNotesForClass = (
  rawNotes: readonly string[],
  className: string,
  allClasses: readonly string[] = [],
  classTeachers: readonly TeacherIdentifier[] = [],
  allTeachers: readonly TeacherIdentifier[] = [],
): { relevant: string[]; other: string[] } => {
  if (className.trim() === "") {
    return { relevant: [...rawNotes], other: [] };
  }

  const flattened: string[] = [];
  for (const n of rawNotes) {
    const parts = splitGroupAnnouncements(n);
    flattened.push(...parts);
  }

  const relevant: string[] = [];
  const other: string[] = [];
  let lastGroupTargets: string[] | null = null;

  let previousNote = "";

  for (const note of flattened) {
    const trimmed = note.trim();
    if (trimmed === "") continue;

    const targets = extractTargetGroups(trimmed, allClasses);

    if (targets.length > 0) {
      lastGroupTargets = targets;
      const matches = targets.some((t) => isTargetMatch(t, className));
      if (matches) {
        relevant.push(trimmed);
      } else {
        other.push(trimmed);
      }
    } else {
      // Check if this line is a continuation of the previous group announcement
      const hasSubstitutionKeywords =
        /\b(?:\d+(?:\s*-\s*\d+)?\s*(?:\.|\b)\s*stund|\d+\s*stund|atcelt|brīv|pašvadīt)/i.test(
          trimmed,
        );
      const isTeacherContinuation =
        lastGroupTargets !== null &&
        /(?:sk\.|[A-ZŠČĢĶĀĒĪŪŅ]\.|,|[–—-]\s*|\bun\b)$/iu.test(previousNote) &&
        trimmed.length < 35;

      const isContinuation =
        lastGroupTargets !== null && (hasSubstitutionKeywords || isTeacherContinuation);

      if (isContinuation && lastGroupTargets !== null) {
        const matches = lastGroupTargets.some((t) => isTargetMatch(t, className));
        if (matches) {
          relevant.push(trimmed);
        } else {
          other.push(trimmed);
        }
      } else {
        lastGroupTargets = null;

        // Check if note mentions teachers
        if (allTeachers.length > 0) {
          const mentioned = extractMentionedTeachers(trimmed, allTeachers);
          if (mentioned.length > 0) {
            const isRelevant = mentioned.some((mt) =>
              classTeachers.some((ct) => areTeachersEqual(mt, ct)),
            );
            if (isRelevant) {
              relevant.push(trimmed);
            } else {
              other.push(trimmed);
            }
            previousNote = trimmed;
            continue;
          }
        }

        // General announcement applicable to all students
        relevant.push(trimmed);
      }
    }
    previousNote = trimmed;
  }

  return { relevant, other };
};
