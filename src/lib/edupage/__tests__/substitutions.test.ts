/**
 * The substitution parser is checked against reference/probe_substitution.py's output for
 * the same fixture — the probe is the oracle (CLAUDE.md). If these diverge, one of them
 * has drifted and MODEL.md §4 needs re-deriving.
 */
import { describe, expect, it } from "vitest";
import { FIXTURE_DATE, FIXTURES, readFixture, readJsonFixture } from "./fixtures.ts";
import {
  otherRatio,
  parseAbsentTeachers,
  parseDaySubstitutions,
  parseInfo,
  parsePeriods,
  splitNotes,
} from "../substitutions.ts";
import type { Substitution } from "../types.ts";

/** snake_case shape emitted by the Python probe. */
type OracleItem = {
  date: string;
  class_name: string;
  group: string | null;
  periods: number[];
  is_original_slot: boolean;
  kind: string;
  subject: string | null;
  subject_from: string | null;
  teacher: string | null;
  teacher_from: string | null;
  room: string | null;
  room_from: string | null;
  moved_from_period: number | null;
  moved_to_period: number | null;
  moved_from_date: string | null;
  moved_to_date: string | null;
  raw: string;
};

const oracle = readJsonFixture<{ notes: string[]; items: OracleItem[] }>(FIXTURES.substJson);
const parsed = parseDaySubstitutions(
  readFixture(FIXTURES.substHtml),
  FIXTURE_DATE,
  "2026-09-09T00:00:00.000Z",
);

const toOracleShape = (s: Substitution): OracleItem => ({
  date: s.date,
  class_name: s.className,
  group: s.group,
  periods: s.periods,
  is_original_slot: s.isOriginalSlot,
  kind: s.kind,
  subject: s.subject,
  subject_from: s.subjectFrom,
  teacher: s.teacher,
  teacher_from: s.teacherFrom,
  room: s.room,
  room_from: s.roomFrom,
  moved_from_period: s.movedFromPeriod,
  moved_to_period: s.movedToPeriod,
  moved_from_date: s.movedFromDate,
  moved_to_date: s.movedToDate,
  raw: s.raw,
});

describe("parsePeriods", () => {
  it("reads a single period", () => {
    expect(parsePeriods("1")).toEqual({ periods: [1], isOriginalSlot: false });
  });

  it("treats parentheses as the vacated original slot", () => {
    expect(parsePeriods("(1)")).toEqual({ periods: [1], isOriginalSlot: true });
  });

  it("expands an inclusive range", () => {
    expect(parsePeriods("7 - 8")).toEqual({ periods: [7, 8], isOriginalSlot: false });
    expect(parsePeriods("(7 - 8)")).toEqual({ periods: [7, 8], isOriginalSlot: true });
  });

  it("expands a multi-step range", () => {
    expect(parsePeriods("6 - 9").periods).toEqual([6, 7, 8, 9]);
  });
});

describe("parseInfo", () => {
  it("never throws and falls back to `other`, keeping raw", () => {
    const weird = "totally unexpected phrasing from a future EduPage release";
    const r = parseInfo(weird, 2026);
    expect(r.kind).toBe("other");
    expect(r.raw).toBe(weird);
  });

  it("keeps raw verbatim even when it parses cleanly", () => {
    const raw = "Matemātika I - Moved from period: 10, Skolotājs: Gene Ķere";
    expect(parseInfo(raw, 2026).raw).toBe(raw);
  });

  it("extracts a leading group label", () => {
    const r = parseInfo("2: Vācu valoda - Atcelts", 2026);
    expect(r.group).toBe("2");
    expect(r.subject).toBe("Vācu valoda");
    expect(r.kind).toBe("cancelled");
  });

  it("reads a cross-day move as a date, not a period", () => {
    const r = parseInfo("Sports - Moved to Piektdiena 11. 09.", 2026);
    expect(r.kind).toBe("moved_out");
    expect(r.movedToDate).toBe("2026-09-11");
    expect(r.movedToPeriod).toBeNull();
  });

  it("classifies a room-only change as room_change", () => {
    const r = parseInfo("Fizika - Kabineta nomaiņa: (130 (30)P) ➔ 109 (19)", 2026);
    expect(r.kind).toBe("room_change");
    expect(r.roomFrom).toBe("130 (30)P");
    expect(r.room).toBe("109 (19)");
  });

  it("keeps kind=substitution when a room change rides along", () => {
    const r = parseInfo(
      "(Valodas) ➔ Atslēdznieka darbi - Aizvietošana: (Liene Elizabete Čakste) ➔ Edgars Geislers, Kabineta nomaiņa: (130 (30)P) ➔ 109 (19)",
      2026,
    );
    expect(r.kind).toBe("substitution");
    expect(r.subjectFrom).toBe("Valodas");
    expect(r.teacherFrom).toBe("Liene Elizabete Čakste");
    expect(r.teacher).toBe("Edgars Geislers");
    expect(r.room).toBe("109 (19)");
  });
});

describe("parseDaySubstitutions vs the Python oracle", () => {
  it("finds the same number of rows", () => {
    expect(parsed.items).toHaveLength(oracle.items.length);
    expect(parsed.items).toHaveLength(55);
  });

  it("produces byte-identical items", () => {
    expect(parsed.items.map(toOracleShape)).toEqual(oracle.items);
  });

  it("splits notes the same way", () => {
    expect(parsed.notes).toEqual(oracle.notes);
  });

  it("matches the documented kind distribution", () => {
    const counts: Record<string, number> = {};
    for (const i of parsed.items) counts[i.kind] = (counts[i.kind] ?? 0) + 1;
    expect(counts).toEqual({
      cancelled: 26,
      moved_out: 12,
      moved_in: 11,
      substitution: 3,
      added: 2,
      room_change: 1,
    });
  });

  it("carries the 5 documented cross-day moves", () => {
    const crossDay = parsed.items.filter((i) => i.movedFromDate ?? i.movedToDate);
    expect(crossDay).toHaveLength(5);
  });

  it("canary: the `other` ratio stays under 15%", () => {
    expect(otherRatio(parsed)).toBeLessThan(0.15);
    expect(otherRatio(parsed)).toBe(0);
  });

  it("extracts absent teachers from fixture", () => {
    expect(parsed.absentTeachers).toEqual([
      "Egija Baumane",
      "Liene Elizabete Čakste",
      "Olga Sabanska",
      "Valda Salmiņa",
    ]);
  });

  it("always keeps raw populated", () => {
    expect(parsed.items.every((i) => i.raw.length > 0)).toBe(true);
  });
});

describe("splitNotes", () => {
  it("splits on sentence boundaries followed by a capital or digit", () => {
    expect(splitNotes("A1 grupai brīvs. B2 grupai nav.")).toEqual([
      "A1 grupai brīvs.",
      "B2 grupai nav.",
    ]);
  });
});

describe("parseAbsentTeachers", () => {
  it("returns absent teachers list when banner is present", () => {
    const doc = new DOMParser().parseFromString(
      '<div style="text-align:center"><span>Skolotāji, kuri nepiedalās: Jānis Bērziņš , Anna Kalniņa ; Pēteris Ozols </span></div>',
      "text/html",
    );
    expect(parseAbsentTeachers(doc)).toEqual([
      "Jānis Bērziņš",
      "Anna Kalniņa",
      "Pēteris Ozols",
    ]);
  });

  it("returns empty array when banner is missing or empty", () => {
    const doc1 = new DOMParser().parseFromString("<div>Nav izmaiņu</div>", "text/html");
    expect(parseAbsentTeachers(doc1)).toEqual([]);

    const doc2 = new DOMParser().parseFromString(
      "<div>Skolotāji, kuri nepiedalās:   </div>",
      "text/html",
    );
    expect(parseAbsentTeachers(doc2)).toEqual([]);
  });
});
