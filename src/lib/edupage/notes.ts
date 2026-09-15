/**
 * School announcement classification & filtering by class/group.
 *
 * EduPage substitution feeds publish daily announcements in a single `.subst_note`
 * block for the whole school. Administrators frequently include group-specific notices
 * (e.g. "N3 grupai 6 - stunda atcelta", "DP2-1 grupai 1. stunda atcelta",
 * "DP2-1, DP2-2 grupām sports zālē") alongside general school-wide announcements.
 *
 * This module parses and filters these notes so students see:
 * 1. Announcements specifically mentioning their class/group.
 * 2. Announcements for their department/programme prefix (e.g. "DP grupām" or "DP2 grupām" for "DP2-1").
 * 3. General school announcements that do not target any specific group.
 *
 * Irrelevant announcements targeting other groups are filtered out.
 */

/**
 * Regex matching group suffixes in Latvian:
 * e.g. "DP2-1 grupai", "DP2-1, DP2-2 grupām", "N3 grupai", "A4-2 grupas", etc.
 */
const GROUP_SUFFIX_RE =
  /\b([-A-Za-z0-9_/]+(?:\s*(?:,|un|\/)\s*[-A-Za-z0-9_/]+)*)\s+grup(?:ai|ām|am|as|a|ā)\b/gi;

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
      /(?<=\S)\s+(?=[-A-Za-z0-9_/]+(?:\s*(?:,|un|\/)\s*[-A-Za-z0-9_/]+)*\s+grup(?:ai|ām|am|as|a|ā)\b)/iu,
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
 * Determines whether an individual announcement is relevant to a selected class.
 */
export const isNoteRelevantForClass = (
  note: string,
  className: string,
  allClasses: readonly string[] = [],
): boolean => {
  const targets = extractTargetGroups(note, allClasses);
  if (targets.length === 0) {
    // General school announcement
    return true;
  }
  return targets.some((t) => isTargetMatch(t, className));
};

/**
 * Partitions daily announcements into those relevant to the selected class
 * and those targeted at other classes.
 */
export const filterNotesForClass = (
  rawNotes: readonly string[],
  className: string,
  allClasses: readonly string[] = [],
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
      const isContinuation =
        lastGroupTargets !== null &&
        (/\b(?:\d+(?:\s*-\s*\d+)?\s*(?:\.|\b)\s*stund|\d+\s*stund|atcelt|brīv|pašvadīt)/i.test(
          trimmed,
        ) ||
          trimmed.length < 35);

      if (isContinuation && lastGroupTargets !== null) {
        const matches = lastGroupTargets.some((t) => isTargetMatch(t, className));
        if (matches) {
          relevant.push(trimmed);
        } else {
          other.push(trimmed);
        }
      } else {
        // General announcement applicable to all students
        lastGroupTargets = null;
        relevant.push(trimmed);
      }
    }
  }

  return { relevant, other };
};
