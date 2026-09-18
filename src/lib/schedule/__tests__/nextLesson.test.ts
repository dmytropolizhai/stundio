/**
 * The widget and the day screen both read these numbers, so the edges matter: the minute a
 * lesson ends, cancelled slots, a day that is not today, and a device in the wrong timezone.
 */
import { describe, expect, it } from "vitest";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { dayProgress, glanceLesson, minutesOf, rigaClock, timedLessons } from "@/lib/schedule";

const lesson = (
  over: Partial<ResolvedLesson> & Pick<ResolvedLesson, "period">,
): ResolvedLesson => ({
  start: "08:30",
  end: "09:10",
  span: 1,
  subject: { id: `s${over.period}`, name: "Matemātika", short: "Mat", color: null },
  teachers: [],
  rooms: [],
  group: null,
  status: "normal",
  changeNote: null,
  original: null,
  ...over,
});

const day = (lessons: ResolvedLesson[], date = "2026-09-09"): ResolvedDay => ({
  date,
  weekday: "wed",
  classId: "-927",
  building: "TIC",
  buildings: ["TIC"],
  ttNum: "1175",
  lessons,
  notes: [],
  stale: false,
});

const LESSONS = [
  lesson({ period: "1", start: "08:30", end: "09:10" }),
  lesson({ period: "2", start: "09:20", end: "10:00" }),
  lesson({ period: "3", start: "10:10", end: "10:50" }),
];

const at = (hhmm: string, date = "2026-09-09") => ({ date, minutes: minutesOf(hhmm) ?? 0 });

describe("minutesOf", () => {
  it("parses a wall-clock time", () => {
    expect(minutesOf("08:30")).toBe(510);
    expect(minutesOf("00:00")).toBe(0);
  });

  it("returns null for the empty times resolveDay emits for unknown periods", () => {
    expect(minutesOf("")).toBeNull();
    expect(minutesOf("oops")).toBeNull();
  });
});

describe("rigaClock", () => {
  it("reads the school's wall clock, not the host's", () => {
    // 21:30 UTC on 2026-09-09 is already 00:30 the next day in Riga (UTC+3 in September).
    expect(rigaClock(new Date("2026-09-09T21:30:00Z"))).toEqual({
      date: "2026-09-10",
      minutes: 30,
    });
  });

  it("handles the winter offset too", () => {
    expect(rigaClock(new Date("2026-12-01T06:00:00Z"))).toEqual({
      date: "2026-12-01",
      minutes: 8 * 60,
    });
  });
});

describe("timedLessons", () => {
  it("drops cancelled lessons and sorts by start time", () => {
    const windows = timedLessons([
      LESSONS[2]!,
      { ...LESSONS[1]!, status: "cancelled" },
      LESSONS[0]!,
    ]);
    expect(windows.map((w) => w.lesson.period)).toEqual(["1", "3"]);
  });

  it("skips lessons with unusable times", () => {
    expect(timedLessons([lesson({ period: "9", start: "", end: "" })])).toEqual([]);
    expect(timedLessons([lesson({ period: "9", start: "10:00", end: "09:00" })])).toEqual([]);
  });
});

describe("dayProgress", () => {
  it("reports the lesson in progress with time left and a ratio", () => {
    const p = dayProgress(day(LESSONS), at("08:50"));
    expect(p.current?.period).toBe("1");
    expect(p.next?.period).toBe("2");
    expect(p.minutesLeftInCurrent).toBe(20);
    expect(p.minutesUntilNext).toBe(30);
    expect(p.progress).toBeCloseTo(0.5);
    expect(p.finished).toBe(false);
  });

  it("treats the end minute as over, not still running", () => {
    const p = dayProgress(day(LESSONS), at("09:10"));
    expect(p.current).toBeNull();
    expect(p.next?.period).toBe("2");
    expect(p.minutesUntilNext).toBe(10);
  });

  it("reports a break before the first lesson", () => {
    const p = dayProgress(day(LESSONS), at("07:00"));
    expect(p.current).toBeNull();
    expect(p.next?.period).toBe("1");
    expect(p.minutesUntilNext).toBe(90);
    expect(p.finished).toBe(false);
  });

  it("marks the day finished after the last lesson ends", () => {
    const p = dayProgress(day(LESSONS), at("16:00"));
    expect(p.current).toBeNull();
    expect(p.next).toBeNull();
    expect(p.finished).toBe(true);
  });

  it("never picks a cancelled lesson as current", () => {
    const p = dayProgress(day([{ ...LESSONS[0]!, status: "cancelled" }, LESSONS[1]!]), at("08:50"));
    expect(p.current).toBeNull();
    expect(p.next?.period).toBe("2");
  });

  it("stays silent for a day that is not today", () => {
    const p = dayProgress(day(LESSONS, "2026-09-10"), at("08:50"));
    expect(p).toEqual({
      current: null,
      next: null,
      minutesUntilNext: null,
      minutesLeftInCurrent: null,
      progress: null,
      nowMinutes: 530,
      finished: false,
    });
  });

  it("handles a missing day and an empty day", () => {
    expect(dayProgress(null, at("08:50")).nowMinutes).toBe(530);
    expect(dayProgress(day([]), at("08:50")).finished).toBe(false);
  });
});

describe("glanceLesson", () => {
  it("prefers the running lesson", () => {
    expect(glanceLesson(day(LESSONS), at("08:50"))).toMatchObject({ live: true, minutes: 20 });
  });

  it("falls back to the upcoming one", () => {
    expect(glanceLesson(day(LESSONS), at("09:15"))).toMatchObject({ live: false, minutes: 5 });
  });

  it("has nothing to show once the day is over", () => {
    expect(glanceLesson(day(LESSONS), at("16:00"))).toBeNull();
  });
});
