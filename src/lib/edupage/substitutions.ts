/**
 * Substitution HTML → `DaySubstitutions`. See MODEL.md §4.
 *
 * This is the fragile half of the project: the only public endpoint returns rendered HTML
 * with Latvian prose, so every pattern below is locale-dependent. Two rules follow from that
 * and are load-bearing (CLAUDE.md):
 *
 *   1. THE PARSER NEVER THROWS. Unknown phrasing → kind "other".
 *   2. `raw` is always the full, untouched `.info` text — the only lossless field.
 *
 * Kept deliberately in lockstep with reference/probe_substitution.py, which is the oracle.
 */
import type { DaySubstitutions, ISODate, SubstKind, Substitution } from "./types.ts";

/** U+2794 — the glyph EduPage uses for "old ➔ new". */
export const ARROW = "\u2794";

const collapseWs = (s: string): string => s.replace(/\s+/g, " ").trim();

/* ------------------------------------------------------------------ *
 * Period cell:  "1" | "(1)" | "7 - 8" | "(7 - 8)"
 * ------------------------------------------------------------------ */

export const parsePeriods = (text: string): { periods: number[]; isOriginalSlot: boolean } => {
  const isOriginalSlot = text.includes("(");
  const nums = [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
  const bare = text.replaceAll("(", "").replaceAll(")", "");
  const [from, to] = nums;
  if (nums.length === 2 && bare.includes(" - ") && from !== undefined && to !== undefined) {
    // "7 - 8" is an inclusive range, not two separate periods.
    const span: number[] = [];
    for (let p = from; p <= to; p += 1) span.push(p);
    return { periods: span, isOriginalSlot };
  }
  return { periods: nums, isOriginalSlot };
};

/** Splits "(old) ➔ new"; without an arrow the whole segment is the new value. */
const oldNew = (segment: string): { from: string | null; to: string | null } => {
  if (!segment.includes(ARROW)) return { from: null, to: segment.trim() || null };
  const at = segment.indexOf(ARROW);
  const left = trimParens(segment.slice(0, at));
  const right = segment.slice(at + ARROW.length).trim();
  return { from: left || null, to: right || null };
};

/** Mirrors Python's `.strip(" ()")` — strips any of space/paren from both ends. */
const trimParens = (s: string): string => s.replace(/^[\s()]+/, "").replace(/[\s()]+$/, "");

/* ------------------------------------------------------------------ *
 * The `.info` grammar (MODEL.md §4)
 * ------------------------------------------------------------------ */

export type ParsedInfo = Omit<Substitution, "date" | "className" | "periods" | "isOriginalSlot">;

/**
 * `year` is needed because cross-day moves are written "Moved to Piektdiena 11. 09." with
 * no year. Using the target date's year matches the probe; it is wrong only across a
 * New Year boundary, which never happens inside a school week.
 */
export const parseInfo = (info: string, year: number): ParsedInfo => {
  const out: ParsedInfo = {
    group: null,
    kind: "other",
    subject: null,
    subjectFrom: null,
    teacher: null,
    teacherFrom: null,
    room: null,
    roomFrom: null,
    movedFromPeriod: null,
    movedToPeriod: null,
    movedFromDate: null,
    movedToDate: null,
    raw: info,
  };

  let body = info;

  // Leading "2: " marks a divided-class group.
  const group = /^\s*(\d+)\s*:\s*(.*)$/.exec(body);
  if (group?.[1] !== undefined && group[2] !== undefined) {
    out.group = group[1];
    body = group[2];
  }

  // "<subject head> - <rest>"; the head may itself be "(old subj) ➔ new subj".
  const sep = body.indexOf(" - ");
  const head = sep < 0 ? body : body.slice(0, sep);
  const rest = sep < 0 ? "" : body.slice(sep + 3);

  if (head.includes(ARROW)) {
    const { from, to } = oldNew(head);
    out.subjectFrom = from;
    out.subject = to;
  } else {
    out.subject = head.trim() || null;
  }

  // Order matters: later matches win, mirroring the probe's sequential overwrites.
  let kind: SubstKind = "other";

  if (/\bAtcelts\b/.test(rest)) kind = "cancelled";

  const movedTo = /Moved to period:\s*(\d+)/.exec(rest);
  if (movedTo?.[1] !== undefined) {
    kind = "moved_out";
    out.movedToPeriod = Number(movedTo[1]);
  }

  const movedFrom = /Moved from period:\s*(\d+)/.exec(rest);
  if (movedFrom?.[1] !== undefined) {
    kind = "moved_in";
    out.movedFromPeriod = Number(movedFrom[1]);
  }

  // Cross-day moves: "Moved to <Weekday> DD. MM."
  const toDate = /Moved to\s+\S+\s+(\d{1,2})\.\s*(\d{1,2})\./.exec(rest);
  if (toDate?.[1] !== undefined && toDate[2] !== undefined) {
    kind = "moved_out";
    out.movedToDate = isoFrom(year, toDate[2], toDate[1]);
  }

  const fromDate = /Moved from\s+\S+\s+(\d{1,2})\.\s*(\d{1,2})\./.exec(rest);
  if (fromDate?.[1] !== undefined && fromDate[2] !== undefined) {
    kind = "moved_in";
    out.movedFromDate = isoFrom(year, fromDate[2], fromDate[1]);
  }

  if (rest.includes("Added")) kind = "added";

  const subst = /Aizvietošana:\s*(.+?)(?:,\s*Kabineta|,\s*Kabinets|$)/.exec(rest);
  if (subst?.[1] !== undefined) {
    const { from, to } = oldNew(subst[1]);
    out.teacherFrom = from;
    out.teacher = to;
    kind = "substitution";
  }

  const roomChange = /Kabineta nomaiņa:\s*(.+?)(?:,\s|$)/.exec(rest);
  if (roomChange?.[1] !== undefined) {
    const { from, to } = oldNew(roomChange[1]);
    out.roomFrom = from;
    out.room = to;
    // A room change only *is* the change when nothing else happened; otherwise it rides along.
    if (kind === "other") kind = "room_change";
  }

  const teacher = /Skolotājs:\s*([^,]+)/.exec(rest);
  if (teacher?.[1] !== undefined) out.teacher = teacher[1].trim();

  const room = /Kabinets:\s*([^,]+)/.exec(rest);
  if (room?.[1] !== undefined) out.room = room[1].trim();

  out.kind = kind;
  return out;
};

const isoFrom = (year: number, month: string, day: string): ISODate =>
  `${String(year).padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

/* ------------------------------------------------------------------ *
 * HTML → DaySubstitutions
 * ------------------------------------------------------------------ */

/**
 * `.subst_note` blocks are free text. The split is heuristic (a surname like "N. Tiltiņš"
 * can split wrong — MODEL.md §4), so notes are display-only and never parsed further.
 */
export const splitNotes = (block: string): string[] =>
  block
    .split(/(?<=\.)\s+(?=[A-ZŠČĢĶĀĒĪŪŅ0-9])/u)
    .map((s) => s.trim())
    .filter((s) => s !== "");

const parseDocument = (html: string): Document | null => {
  try {
    return new DOMParser().parseFromString(html, "text/html");
  } catch {
    return null; // rule 1: never throw
  }
};

/**
 * Absent teachers banner: "Skolotāji, kuri nepiedalās: Name1 , Name2 , Name3".
 * EduPage substitution pages put this in a centered div/span above the class sections.
 */
export const parseAbsentTeachers = (doc: Document): string[] => {
  for (const el of doc.querySelectorAll("div, span")) {
    const text = collapseWs(el.textContent ?? "");
    const match = /^Skolotāji,\s*kuri\s*nepiedalās:\s*(.*)$/i.exec(text);
    if (match?.[1] !== undefined) {
      return match[1]
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
  }
  return [];
};

export const parseDaySubstitutions = (
  html: string,
  date: ISODate,
  fetchedAt: string,
  mode: "classes" = "classes",
): DaySubstitutions => {
  const empty: DaySubstitutions = { date, mode, notes: [], items: [], fetchedAt };
  const doc = parseDocument(html);
  if (doc === null) return empty;

  const year = Number(date.slice(0, 4)) || new Date().getUTCFullYear();

  const notes = [...doc.querySelectorAll(".subst_note")].flatMap((el) =>
    splitNotes(collapseWs(el.textContent ?? "")),
  );

  const absentTeachers = parseAbsentTeachers(doc);

  const items: Substitution[] = [];
  for (const section of doc.querySelectorAll(".section")) {
    const className = collapseWs(section.querySelector(".header")?.textContent ?? "");
    for (const row of section.querySelectorAll(".row")) {
      const periodText = collapseWs(row.querySelector(".period")?.textContent ?? "");
      const infoText = collapseWs(row.querySelector(".info")?.textContent ?? "");
      if (infoText === "") continue;
      const { periods, isOriginalSlot } = parsePeriods(periodText);
      items.push({
        date,
        className: className || "?",
        periods,
        isOriginalSlot,
        ...parseInfo(infoText, year),
      });
    }
  }

  return {
    date,
    mode,
    notes,
    items,
    fetchedAt,
    ...(absentTeachers.length > 0 ? { absentTeachers } : {}),
  };
};

/** Share of rows the grammar failed to classify — the "canary" from CLAUDE.md. */
export const otherRatio = (day: DaySubstitutions): number =>
  day.items.length === 0
    ? 0
    : day.items.filter((i) => i.kind === "other").length / day.items.length;
