import { describe, expect, it } from "vitest";
import { longBreaks, startOfWeek, weekDates, weekPeriods } from "@/lib/schedule";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";

describe("startOfWeek", () => {
  it("returns the Monday of the same week", () => {
    expect(startOfWeek("2026-09-09")).toBe("2026-09-07"); // Wednesday
    expect(startOfWeek("2026-09-07")).toBe("2026-09-07"); // Monday itself
  });

  it("treats the weekend as the tail of the week just gone, not the start of the next", () => {
    expect(startOfWeek("2026-09-13")).toBe("2026-09-07"); // Sunday
  });

  it("crosses a month boundary", () => {
    expect(startOfWeek("2026-10-01")).toBe("2026-09-28");
  });
});

describe("weekDates", () => {
  it("is Monday to Friday", () => {
    expect(weekDates("2026-09-09")).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
    ]);
  });
});

describe("weekPeriods", () => {
  const lesson = (period: string, start: string, end: string, span = 1) =>
    ({ period, start, end, span }) as unknown as ResolvedLesson;

  const day = (...lessons: ResolvedLesson[]) => ({ lessons }) as unknown as ResolvedDay;

  it("returns only the periods some day actually fills, in numeric order", () => {
    const periods = weekPeriods([
      day(lesson("10", "16:00", "16:40"), lesson("2", "09:20", "10:00")),
      day(lesson("1", "08:30", "09:10")),
    ]);
    expect(periods.map((p) => p.period)).toEqual(["1", "2", "10"]);
  });

  it("carries the start and end time of each row", () => {
    expect(weekPeriods([day(lesson("1", "08:30", "09:10"))])).toEqual([
      { period: "1", start: "08:30", end: "09:10" },
    ]);
  });

  it("prefers a single lesson's times over a double's block end", () => {
    // A double starting at period 3 ends when period 4 does — that is not row 3's end time.
    const double = day(lesson("3", "10:10", "11:40", 2));
    const single = day(lesson("3", "10:10", "10:50"));

    expect(weekPeriods([double, single])[0]?.end).toBe("10:50");
    expect(weekPeriods([single, double])[0]?.end).toBe("10:50");
  });

  it("still reports a block's end when the week has nothing but doubles in that row", () => {
    expect(weekPeriods([day(lesson("3", "10:10", "11:40", 2))])[0]?.end).toBe("11:40");
  });

  it("includes all periods covered by a multi-period lesson span", () => {
    // A 5-period block starting at period 8 (14:20) runs until period 12 (18:00).
    const periods = weekPeriods([day(lesson("8", "14:20", "18:00", 5))]);
    expect(periods.map((p) => p.period)).toEqual(["8", "9", "10", "11", "12"]);
    expect(periods.find((p) => p.period === "8")?.start).toBe("14:20");
    expect(periods.find((p) => p.period === "12")).toEqual({
      period: "12",
      start: "17:20",
      end: "18:00",
    });
  });

  it("uses day.periods bell schedule when available for covered periods", () => {
    const dayWithPeriods = {
      lessons: [lesson("8", "14:20", "18:00", 5)],
      periods: [
        { period: "8", name: "8", start: "14:20", end: "15:00" },
        { period: "9", name: "9", start: "15:05", end: "15:45" },
        { period: "10", name: "10", start: "15:50", end: "16:30" },
        { period: "11", name: "11", start: "16:35", end: "17:15" },
        { period: "12", name: "12", start: "17:20", end: "18:00" },
      ],
    } as unknown as ResolvedDay;

    const periods = weekPeriods([dayWithPeriods]);
    expect(periods).toEqual([
      { period: "8", start: "14:20", end: "15:00" },
      { period: "9", start: "15:05", end: "15:45" },
      { period: "10", start: "15:50", end: "16:30" },
      { period: "11", start: "16:35", end: "17:15" },
      { period: "12", start: "17:20", end: "18:00" },
    ]);
  });

  it("ignores days with nothing cached", () => {
    expect(weekPeriods([null, null])).toEqual([]);
  });
});

describe("longBreaks", () => {
  const row = (period: string, start: string, end: string) => ({ period, start, end });

  it("marks only the gap of 20+ minutes, keyed by the row after it", () => {
    const rows = [
      row("4", "10:55", "11:35"),
      row("5", "12:05", "12:45"),
      row("6", "12:50", "13:30"),
    ];
    expect([...longBreaks(rows)]).toEqual([["5", 30]]);
  });

  it("respects the threshold", () => {
    const rows = [row("1", "08:30", "09:10"), row("2", "09:30", "10:10")];
    expect(longBreaks(rows).size).toBe(1);
    expect(longBreaks(rows, 21).size).toBe(0);
  });

  it("does not call an unused period slot a break", () => {
    // Nobody has a period-2 lesson, so row 3 follows row 1 — a hole, not a break.
    const rows = [row("1", "08:30", "09:10"), row("3", "10:10", "10:50")];
    expect(longBreaks(rows).size).toBe(0);
  });

  it("ignores rows without times", () => {
    expect(longBreaks([row("1", "08:30", "09:10"), row("2", "", "")]).size).toBe(0);
  });

  it("can find several breaks in one day", () => {
    const rows = [
      row("1", "08:30", "09:10"),
      row("2", "09:40", "10:20"),
      row("3", "11:00", "11:40"),
    ];
    expect([...longBreaks(rows).keys()]).toEqual(["2", "3"]);
  });
});
