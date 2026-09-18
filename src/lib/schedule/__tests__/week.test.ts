import { describe, expect, it } from "vitest";
import { startOfWeek, weekDates, weekPeriods } from "@/lib/schedule";
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

  it("ignores days with nothing cached", () => {
    expect(weekPeriods([null, null])).toEqual([]);
  });
});
