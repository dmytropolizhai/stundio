/**
 * Raw aSc tables (regularttGetData) → `Timetable`. See MODEL.md §2.
 *
 * One `card` = one placed slot. Cards whose `days` bitmask is empty are UNPLACED
 * (568 of 3336 in the 2026-09-09 fixture) and are dropped, matching the Python probe.
 */
import type {
  Building,
  ClassRef,
  ISODate,
  ISODateTime,
  Lesson,
  Period,
  RoomRef,
  SubjectRef,
  TeacherRef,
  Timetable,
  TimetableMeta,
  Weekday,
} from "./types.ts";

type Row = Record<string, unknown>;
export type RawTables = Record<string, Row[]>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x !== "") : [];
const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const WEEKDAYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** `"00100"` → "wed". Returns null when no day bit is set (an unplaced card). */
export const weekdayFromBitmask = (mask: string): Weekday | null => {
  const idx = mask.indexOf("1");
  if (idx < 0) return null;
  return WEEKDAYS[idx] ?? null;
};

/* ------------------------------------------------------------------ *
 * Entity tables
 * ------------------------------------------------------------------ */

const toEntityRef = (r: Row): ClassRef => ({
  id: str(r["id"]),
  // RVT leaves `name` empty on teachers; fall back so the UI always has something.
  name: str(r["name"]) || str(r["short"]),
  short: str(r["short"]) || str(r["name"]),
  color: strOrNull(r["color"]),
});

const toRoomRef = (r: Row): RoomRef => ({
  id: str(r["id"]),
  name: str(r["name"]) || str(r["short"]),
  short: str(r["short"]) || str(r["name"]),
});

const toPeriod = (r: Row): Period => ({
  period: str(r["period"]),
  name: str(r["name"]) || str(r["period"]),
  start: str(r["starttime"]),
  end: str(r["endtime"]),
});

/* ------------------------------------------------------------------ *
 * The join
 * ------------------------------------------------------------------ */

export type NormalizeStats = {
  cards: number;
  placedCards: number;
  /** Placed cards dropped because their lesson resolved to no class at all. */
  orphanCards: number;
};

export type NormalizeResult = { timetable: Timetable; stats: NormalizeStats };

export const normalizeTimetable = (tables: RawTables, meta: TimetableMeta): NormalizeResult => {
  const classes = (tables["classes"] ?? []).map(toEntityRef);
  const teachers: TeacherRef[] = (tables["teachers"] ?? []).map(toEntityRef);
  const subjects: SubjectRef[] = (tables["subjects"] ?? []).map(toEntityRef);
  const rooms = (tables["classrooms"] ?? []).map(toRoomRef);
  const periods = (tables["periods"] ?? []).map(toPeriod);

  const lessonsById = new Map<string, Row>((tables["lessons"] ?? []).map((r) => [str(r["id"]), r]));

  // groupid → { classid, label }. `name` is the label the substitution feed uses ("1", "2");
  // `ascttdivision` is only the division index, so it is NOT a usable group label.
  const groups = new Map<string, { classId: string; label: string }>();
  for (const g of tables["groups"] ?? []) {
    groups.set(str(g["id"]), {
      classId: str(g["classid"]),
      label: g["entireclass"] === true ? "" : str(g["name"]),
    });
  }

  const cards = tables["cards"] ?? [];
  const lessons: Lesson[] = [];
  let placedCards = 0;
  let orphanCards = 0;

  for (const card of cards) {
    const day = weekdayFromBitmask(str(card["days"]));
    if (day === null) continue; // unplaced card
    placedCards += 1;

    const lesson = lessonsById.get(str(card["lessonid"]));
    if (!lesson) {
      orphanCards += 1;
      continue;
    }

    // MODEL.md §2: direct classids ∪ classes reached through groupids.
    const classIds = new Set(strList(lesson["classids"]));
    const groupIds = strList(lesson["groupids"]);
    for (const gid of groupIds) {
      const g = groups.get(gid);
      if (g?.classId) classIds.add(g.classId);
    }
    if (classIds.size === 0) {
      // Lessons with neither classids nor groupids cannot be attributed to a class.
      orphanCards += 1;
      continue;
    }

    // `groupnames` carries the division label directly; groups[].name is the fallback.
    const groupLabels = strList(lesson["groupnames"]).filter((n) => n !== "");
    const labels =
      groupLabels.length > 0
        ? groupLabels
        : groupIds.map((gid) => groups.get(gid)?.label ?? "").filter((n) => n !== "");

    lessons.push({
      id: str(card["id"]),
      classIds: [...classIds],
      groups: [...new Set(labels)],
      subjectId: str(lesson["subjectid"]),
      teacherIds: strList(lesson["teacherids"]),
      roomIds: strList(card["classroomids"]),
      day,
      period: str(card["period"]),
      periodSpan: Math.max(1, num(lesson["durationperiods"], 1)),
      weekMask: str(card["weeks"]) || "1",
      // NOTE: `terms` lives on the LESSON, not the card (MODEL.md §2 says card — it is wrong;
      // no card in the fixture has a `terms` field).
      termMask: str(lesson["terms"]) || "1",
    });
  }

  return {
    timetable: { meta, periods, classes, teachers, subjects, rooms, lessons },
    stats: { cards: cards.length, placedCards, orphanCards },
  };
};

/* ------------------------------------------------------------------ *
 * Meta from the ttviewer entry (MODEL.md §3)
 * ------------------------------------------------------------------ */

/** "Galvenā ēka 07.09.2026. (07. 09. - 11. 09. 2026)" → building + validTo. */
export const parseTimetableLabel = (
  text: string,
): { building: Building; validTo: ISODate | null } => {
  // Building = everything before the first "DD.MM.YYYY." stamp.
  const building =
    str(text)
      .split(/\s+\d{1,2}\.\s*\d{1,2}\.\s*\d{4}/)[0]
      ?.trim() ?? "";
  const range = /\(\s*\d{1,2}\.\s*\d{1,2}\.\s*-\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*\)/.exec(
    text,
  );
  const validTo =
    range && range[1] && range[2] && range[3]
      ? `${range[3]}-${range[2].padStart(2, "0")}-${range[1].padStart(2, "0")}`
      : null;
  return { building, validTo };
};

export const toTimetableMeta = (
  entry: { tt_num: string; text: string; datefrom: string; year: number },
  fetchedAt: ISODateTime,
): TimetableMeta => {
  const { building, validTo } = parseTimetableLabel(entry.text);
  return {
    ttNum: entry.tt_num,
    building,
    validFrom: entry.datefrom,
    ...(validTo === null ? {} : { validTo }),
    label: entry.text,
    schoolYear: entry.year,
    fetchedAt,
  };
};
