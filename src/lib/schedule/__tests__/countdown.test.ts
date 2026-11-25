import { describe, expect, it } from "vitest";
import {
  formatCompactCountdown,
  formatFullCountdown,
  schoolCountdown,
  schoolDayProgress,
  type DayBrief,
} from "../index.ts";

describe("schoolCountdown", () => {
  it("returns null when brief is null", () => {
    expect(schoolCountdown(null, 540, false)).toBeNull();
    expect(schoolCountdown(null, 540, true)).toBeNull();
  });

  it("counts down to end when ongoing", () => {
    const brief: DayBrief = {
      kind: "ongoing",
      remaining: 3,
      start: "08:30",
      end: "15:05",
      changedCount: 0,
    };
    // 13:00 -> 15:05 = 125 minutes
    const res = schoolCountdown(brief, 13 * 60, false);
    expect(res).toEqual({
      kind: "until",
      target: "end",
      minutes: 125,
      hours: 2,
      rest: 5,
    });
    if (res?.kind === "until") {
      expect(formatCompactCountdown(res)).toEqual({ value: "2+", showMinUnit: false });
      expect(formatFullCountdown(res)).toBe("2:05");
    }
  });

  it("handles 0, 59, 60, 61 and 125 minutes boundaries", () => {
    const brief: DayBrief = {
      kind: "ongoing",
      remaining: 1,
      start: "08:30",
      end: "12:05",
      changedCount: 0,
    };
    const endMin = 12 * 60 + 5;
    const cases = [
      { diff: 0, hours: 0, rest: 0, compact: { value: "0", showMinUnit: true }, full: "0:00" },
      { diff: 59, hours: 0, rest: 59, compact: { value: "59", showMinUnit: true }, full: "0:59" },
      { diff: 60, hours: 1, rest: 0, compact: { value: "1+", showMinUnit: false }, full: "1:00" },
      { diff: 61, hours: 1, rest: 1, compact: { value: "1+", showMinUnit: false }, full: "1:01" },
      { diff: 125, hours: 2, rest: 5, compact: { value: "2+", showMinUnit: false }, full: "2:05" },
    ];

    for (const c of cases) {
      const res = schoolCountdown(brief, endMin - c.diff, false);
      expect(res).toEqual({
        kind: "until",
        target: "end",
        minutes: c.diff,
        hours: c.hours,
        rest: c.rest,
      });
      if (res?.kind === "until") {
        expect(formatCompactCountdown(res)).toEqual(c.compact);
        expect(formatFullCountdown(res)).toBe(c.full);
      }
    }
  });

  it("clamps negative remaining minutes to 0", () => {
    const brief: DayBrief = {
      kind: "ongoing",
      remaining: 1,
      start: "08:30",
      end: "10:00",
      changedCount: 0,
    };
    const res = schoolCountdown(brief, 10 * 60 + 15, false);
    expect(res).toEqual({
      kind: "until",
      target: "end",
      minutes: 0,
      hours: 0,
      rest: 0,
    });
  });

  it("counts down to start when ahead on today", () => {
    const brief: DayBrief = {
      kind: "ahead",
      lessonCount: 6,
      start: "08:30",
      end: "14:15",
      changedCount: 0,
    };
    // 07:48 -> 08:30 = 42 minutes
    const res = schoolCountdown(brief, 7 * 60 + 48, false);
    expect(res).toEqual({
      kind: "until",
      target: "start",
      minutes: 42,
      hours: 0,
      rest: 42,
    });
    if (res?.kind === "until") {
      expect(formatCompactCountdown(res)).toEqual({ value: "42", showMinUnit: true });
      expect(formatFullCountdown(res)).toBe("0:42");
    }
  });

  it("returns startsAt for ahead on a later browsed day", () => {
    const brief: DayBrief = {
      kind: "ahead",
      lessonCount: 5,
      start: "08:30",
      end: "13:30",
      changedCount: 1,
    };
    expect(schoolCountdown(brief, 10 * 60, true)).toEqual({
      kind: "startsAt",
      start: "08:30",
    });
  });

  it("returns done for finished brief", () => {
    const brief: DayBrief = { kind: "finished", end: "15:10" };
    expect(schoolCountdown(brief, 16 * 60, false)).toEqual({
      kind: "done",
      end: "15:10",
    });
  });

  it("returns free for free brief", () => {
    const brief: DayBrief = { kind: "free" };
    expect(schoolCountdown(brief, 10 * 60, false)).toEqual({ kind: "free" });
    expect(schoolCountdown(brief, 10 * 60, true)).toEqual({ kind: "free" });
  });
});

describe("schoolDayProgress", () => {
  it("returns null for null or free brief", () => {
    expect(schoolDayProgress(null, 600, false)).toBeNull();
    expect(schoolDayProgress({ kind: "free" }, 600, false)).toBeNull();
  });

  it("returns 0 for ahead and 1 for finished", () => {
    const ahead: DayBrief = {
      kind: "ahead",
      lessonCount: 4,
      start: "08:30",
      end: "13:30",
      changedCount: 0,
    };
    expect(schoolDayProgress(ahead, 7 * 60 + 45, false)).toBe(0);
    expect(schoolDayProgress(ahead, 10 * 60, true)).toBe(0);
    expect(schoolDayProgress({ kind: "finished", end: "13:30" }, 15 * 60, false)).toBe(1);
  });

  it("interpolates linearly from start to end during ongoing day and clamps out-of-range", () => {
    const brief: DayBrief = {
      kind: "ongoing",
      remaining: 2,
      start: "08:00",
      end: "12:00",
      changedCount: 0,
    };
    expect(schoolDayProgress(brief, 8 * 60, false)).toBe(0);
    expect(schoolDayProgress(brief, 9 * 60, false)).toBeCloseTo(0.25, 5);
    expect(schoolDayProgress(brief, 10 * 60, false)).toBeCloseTo(0.5, 5);
    expect(schoolDayProgress(brief, 11 * 60 + 30, false)).toBeCloseTo(0.875, 5);
    expect(schoolDayProgress(brief, 12 * 60, false)).toBe(1);
    expect(schoolDayProgress(brief, 7 * 60, false)).toBe(0);
    expect(schoolDayProgress(brief, 13 * 60, false)).toBe(1);
    expect(schoolDayProgress(brief, 10 * 60, true)).toBe(0);
  });

  it("handles degenerate zero-length span safely", () => {
    const brief: DayBrief = {
      kind: "ongoing",
      remaining: 1,
      start: "10:00",
      end: "10:00",
      changedCount: 0,
    };
    expect(schoolDayProgress(brief, 9 * 60 + 59, false)).toBe(0);
    expect(schoolDayProgress(brief, 10 * 60, false)).toBe(1);
  });
});
