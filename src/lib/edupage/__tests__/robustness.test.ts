/**
 * Risk #1 in PLAN.md: "EduPage changes the undocumented API". Every function here is fed
 * malformed, truncated or wrong-typed input and must degrade rather than throw — the
 * parser-never-throws rule from CLAUDE.md, tested on purpose instead of hoped for.
 */
import { describe, expect, it } from "vitest";
import { normalizeTimetable, parseTimetableLabel, toTimetableMeta } from "../normalize.ts";
import { parseDaySubstitutions, parseInfo, parsePeriods } from "../substitutions.ts";
import { resolveDay } from "../resolve.ts";
import { selectTimetable } from "../select.ts";
import type { RawTables } from "../normalize.ts";
import type { TimetableMeta } from "../types.ts";

const meta: TimetableMeta = toTimetableMeta(
  {
    tt_num: "1",
    text: "TIC 07.09.2026. (07. 09. - 11. 09. 2026)",
    datefrom: "2026-09-07",
    year: 2026,
  },
  "2026-09-09T00:00:00.000Z",
);

describe("normalizeTimetable on hostile input", () => {
  it("survives entirely empty tables", () => {
    const { timetable, stats } = normalizeTimetable({}, meta);
    expect(timetable.lessons).toEqual([]);
    expect(stats).toEqual({ cards: 0, placedCards: 0, orphanCards: 0 });
  });

  it("skips a card whose lesson does not exist", () => {
    const tables: RawTables = {
      cards: [{ id: "c1", lessonid: "missing", days: "10000", period: "1" }],
      lessons: [],
    };
    const { timetable, stats } = normalizeTimetable(tables, meta);
    expect(timetable.lessons).toEqual([]);
    expect(stats.orphanCards).toBe(1);
  });

  it("skips a lesson that resolves to no class", () => {
    const tables: RawTables = {
      cards: [{ id: "c1", lessonid: "l1", days: "10000", period: "1" }],
      lessons: [{ id: "l1", subjectid: "s1", classids: [], groupids: [] }],
    };
    expect(normalizeTimetable(tables, meta).stats.orphanCards).toBe(1);
  });

  it("tolerates wrong types where strings are expected", () => {
    const tables: RawTables = {
      classes: [{ id: "c", name: 42, short: null, color: [] }],
      cards: [{ id: 1, lessonid: "l1", days: "10000", period: 3, classroomids: "nope" }],
      lessons: [{ id: "l1", classids: ["c"], teacherids: [null, "t"], durationperiods: "x" }],
    };
    const { timetable } = normalizeTimetable(tables, meta);
    const lesson = timetable.lessons[0];
    expect(lesson?.teacherIds).toEqual(["t"]); // the null is dropped
    expect(lesson?.roomIds).toEqual([]); // a non-array becomes empty
    expect(lesson?.periodSpan).toBe(1); // unparseable duration falls back to 1
    expect(timetable.classes[0]?.name).toBe(""); // non-string name becomes ""
  });

  it("falls back to a span of at least one period", () => {
    const tables: RawTables = {
      cards: [{ id: "c1", lessonid: "l1", days: "10000", period: "1" }],
      lessons: [{ id: "l1", classids: ["k"], durationperiods: 0 }],
    };
    expect(normalizeTimetable(tables, meta).timetable.lessons[0]?.periodSpan).toBe(1);
  });

  it("defaults the week and term masks when absent", () => {
    const tables: RawTables = {
      cards: [{ id: "c1", lessonid: "l1", days: "10000", period: "1" }],
      lessons: [{ id: "l1", classids: ["k"] }],
    };
    const lesson = normalizeTimetable(tables, meta).timetable.lessons[0];
    expect(lesson?.weekMask).toBe("1");
    expect(lesson?.termMask).toBe("1");
  });

  it("parses a label with no recognisable structure", () => {
    expect(parseTimetableLabel("")).toEqual({ building: "", validTo: null });
    expect(parseTimetableLabel("???")).toEqual({ building: "???", validTo: null });
  });
});

describe("substitution parser on hostile input", () => {
  it("returns an empty day for empty or junk HTML", () => {
    for (const html of ["", "<not-html", "plain text", "<div></div>"]) {
      const day = parseDaySubstitutions(html, "2026-09-09", "now");
      expect(day.items).toEqual([]);
      expect(day.notes).toEqual([]);
    }
  });

  it("keeps a row whose period cell is missing or unreadable", () => {
    const html = `<div class="section"><div class="header">A1</div>
      <div class="row"><div class="period"></div><div class="info">Sports - Atcelts</div></div>
    </div>`;
    const day = parseDaySubstitutions(html, "2026-09-09", "now");
    expect(day.items).toHaveLength(1);
    expect(day.items[0]?.periods).toEqual([]);
    expect(day.items[0]?.kind).toBe("cancelled");
  });

  it("falls back to '?' when a section has no header", () => {
    const html = `<div class="section">
      <div class="row"><div class="period">1</div><div class="info">X - Atcelts</div></div>
    </div>`;
    expect(parseDaySubstitutions(html, "2026-09-09", "now").items[0]?.className).toBe("?");
  });

  it("drops rows with no info text rather than emitting empty items", () => {
    const html = `<div class="section"><div class="header">A1</div>
      <div class="row"><div class="period">1</div><div class="info"></div></div>
    </div>`;
    expect(parseDaySubstitutions(html, "2026-09-09", "now").items).toEqual([]);
  });

  it("classifies unknown Latvian phrasing as `other` and keeps raw", () => {
    const html = `<div class="section"><div class="header">A1</div>
      <div class="row"><div class="period">3</div><div class="info">Kaut kas pavisam jauns</div></div>
    </div>`;
    const item = parseDaySubstitutions(html, "2026-09-09", "now").items[0];
    expect(item?.kind).toBe("other");
    expect(item?.raw).toBe("Kaut kas pavisam jauns");
  });

  it("handles an info string with no ' - ' separator", () => {
    const r = parseInfo("Atcelts", 2026);
    expect(r.subject).toBe("Atcelts");
    expect(r.kind).toBe("other"); // no rest segment, so nothing matched
  });

  it("handles empty and non-numeric period cells", () => {
    expect(parsePeriods("")).toEqual({ periods: [], isOriginalSlot: false });
    expect(parsePeriods("()")).toEqual({ periods: [], isOriginalSlot: true });
    expect(parsePeriods("abc")).toEqual({ periods: [], isOriginalSlot: false });
  });

  it("does not treat two unrelated numbers as a range", () => {
    expect(parsePeriods("3, 9").periods).toEqual([3, 9]);
  });
});

describe("selection and resolution on hostile input", () => {
  it("returns null when nothing is published", () => {
    expect(selectTimetable([], "2026-09-09")).toBeNull();
  });

  it("selects across buildings when none is requested", () => {
    expect(selectTimetable([meta], "2026-09-09")?.meta.ttNum).toBe("1");
  });

  it("resolves an empty timetable without throwing", () => {
    const { timetable } = normalizeTimetable({}, meta);
    const day = resolveDay(timetable, null, "anything", "2026-09-09");
    expect(day.lessons).toEqual([]);
    expect(day.ttNum).toBe("1");
  });

  it("falls back to Monday for an unparseable date", () => {
    const { timetable } = normalizeTimetable({}, meta);
    expect(resolveDay(timetable, null, "x", "not-a-date").weekday).toBe("mon");
  });

  it("honours an explicit stale override from selectTimetable", () => {
    const { timetable } = normalizeTimetable({}, meta);
    expect(resolveDay(timetable, null, "x", "2026-09-09", { stale: true }).stale).toBe(true);
  });

  it("synthesises refs for names the base timetable does not know", () => {
    const tables: RawTables = {
      periods: [{ id: "1", period: "1", starttime: "08:00", endtime: "08:40" }],
      classes: [{ id: "k", name: "A1", short: "A1" }],
    };
    const { timetable } = normalizeTimetable(tables, meta);
    const day = resolveDay(
      timetable,
      {
        date: "2026-09-09",
        mode: "classes",
        notes: [],
        fetchedAt: "now",
        items: [
          {
            date: "2026-09-09",
            className: "A1",
            group: null,
            periods: [1],
            isOriginalSlot: false,
            kind: "added",
            subject: "Jauns priekšmets",
            subjectFrom: null,
            teacher: "Nezināms Skolotājs",
            teacherFrom: null,
            room: "999",
            roomFrom: null,
            movedFromPeriod: null,
            movedToPeriod: null,
            movedFromDate: null,
            movedToDate: null,
            raw: "Jauns priekšmets - Added",
          },
        ],
      },
      "k",
      "2026-09-09",
    );
    const lesson = day.lessons[0];
    expect(lesson?.status).toBe("added");
    expect(lesson?.subject?.short).toBe("Jauns priekšmets");
    expect(lesson?.subject?.id).toBe("subst:Jauns priekšmets"); // marked synthetic
    expect(lesson?.teachers[0]?.short).toBe("Nezināms Skolotājs");
    expect(lesson?.rooms[0]?.short).toBe("999");
    expect(lesson?.start).toBe("08:00");
  });
});
