/**
 * The top-of-screen answers. The edges that matter: a break (not a lesson) before the next
 * one, a cancelled slot that must not count, a walk between buildings, and a day with nothing.
 */
import { describe, expect, it } from "vitest";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { dayGlance, daySummary, minutesOf, tomorrowPreview } from "@/lib/schedule";

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
  building: "Galvenā ēka",
  buildings: ["Galvenā ēka", "TIC"],
  ttNum: "1175",
  lessons,
  notes: [],
  stale: false,
});

const at = (hhmm: string, date = "2026-09-09") => ({ date, minutes: minutesOf(hhmm) ?? 0 });

const MAIN = (period: string, start: string, end: string, over: Partial<ResolvedLesson> = {}) =>
  lesson({ period, start, end, building: "Galvenā ēka", ...over });
const ANNEX = (period: string, start: string, end: string, over: Partial<ResolvedLesson> = {}) =>
  lesson({ period, start, end, building: "TIC", ...over });

describe("dayGlance", () => {
  const lessons = [
    MAIN("1", "08:30", "09:10"),
    MAIN("2", "09:20", "10:00"),
    ANNEX("3", "10:30", "11:10"),
  ];

  it("is live inside a lesson, with minutes left and the lesson after it", () => {
    const g = dayGlance(day(lessons), at("08:50"));
    expect(g).toMatchObject({ kind: "live", minutesLeft: 20, followingHop: false });
    if (g?.kind !== "live") throw new Error("expected live");
    expect(g.lesson.period).toBe("1");
    expect(g.following?.period).toBe("2");
    expect(g.progress).toBeCloseTo(0.5);
  });

  it("flags the walk to another building from the lesson in progress", () => {
    const g = dayGlance(day(lessons), at("09:30"));
    if (g?.kind !== "live") throw new Error("expected live");
    expect(g.following?.period).toBe("3");
    expect(g.followingHop).toBe(true);
  });

  it("has no following lesson on the last one", () => {
    const g = dayGlance(day(lessons), at("10:40"));
    if (g?.kind !== "live") throw new Error("expected live");
    expect(g.following).toBeNull();
    expect(g.followingHop).toBe(false);
  });

  it("counts down to the next lesson during a break, without a hop inside one building", () => {
    const g = dayGlance(day(lessons), at("09:12"));
    expect(g).toMatchObject({ kind: "upcoming", minutesUntil: 8, hop: false, from: null });
  });

  it("names the building to leave when the next lesson is elsewhere", () => {
    const g = dayGlance(day(lessons), at("10:05"));
    expect(g).toMatchObject({ kind: "upcoming", minutesUntil: 25, hop: true, from: "Galvenā ēka" });
  });

  it("never reports a hop before the first lesson — there is nowhere to walk from", () => {
    const g = dayGlance(day([ANNEX("1", "08:30", "09:10")]), at("08:00"));
    expect(g).toMatchObject({ kind: "upcoming", minutesUntil: 30, hop: false, from: null });
  });

  it("skips a cancelled lesson when working out where the walk starts", () => {
    const withCancelled = [
      MAIN("1", "08:30", "09:10"),
      ANNEX("2", "09:20", "10:00", { status: "cancelled" }),
      MAIN("3", "10:10", "10:50"),
    ];
    const g = dayGlance(day(withCancelled), at("09:15"));
    expect(g).toMatchObject({ kind: "upcoming", hop: false });
  });

  it("falls back to the day's building for a lesson that carries none", () => {
    const g = dayGlance(
      day([lesson({ period: "1", start: "08:30", end: "09:10" }), ANNEX("2", "09:20", "10:00")]),
      at("09:12"),
    );
    expect(g).toMatchObject({ kind: "upcoming", hop: true, from: "Galvenā ēka" });
  });

  it("is finished once every lesson has ended", () => {
    expect(dayGlance(day(lessons), at("12:00"))).toEqual({ kind: "finished" });
  });

  it("is null for another date, a missing day, or a day without lessons", () => {
    expect(dayGlance(day(lessons), at("09:00", "2026-09-10"))).toBeNull();
    expect(dayGlance(null, at("09:00"))).toBeNull();
    expect(dayGlance(day([]), at("09:00"))).toBeNull();
  });
});

describe("daySummary", () => {
  it("gives first start, last end, lesson count and the free periods in between", () => {
    const s = daySummary(
      day([
        MAIN("1", "08:30", "09:10"),
        MAIN("2", "09:20", "10:00"),
        MAIN("4", "11:40", "12:20"),
        MAIN("5", "12:30", "13:10"),
      ]),
    );
    expect(s).toEqual({ start: "08:30", end: "13:10", lessonCount: 4, freeMinutes: 100 });
  });

  it("does not count ordinary breaks as free time", () => {
    const s = daySummary(day([MAIN("1", "08:30", "09:10"), MAIN("2", "09:20", "10:00")]));
    expect(s?.freeMinutes).toBe(0);
  });

  it("ignores cancelled lessons at the edges and counts the gap they leave", () => {
    const s = daySummary(
      day([
        MAIN("1", "08:30", "09:10", { status: "cancelled" }),
        MAIN("2", "09:20", "10:00"),
        MAIN("3", "10:10", "10:50", { status: "cancelled" }),
      ]),
    );
    expect(s).toEqual({ start: "09:20", end: "10:00", lessonCount: 1, freeMinutes: 0 });
  });

  it("is null with no lessons that take place", () => {
    expect(daySummary(null)).toBeNull();
    expect(daySummary(day([]))).toBeNull();
    expect(daySummary(day([MAIN("1", "08:30", "09:10", { status: "cancelled" })]))).toBeNull();
  });
});

describe("tomorrowPreview", () => {
  it("reports the first lesson that takes place and how much changed", () => {
    const p = tomorrowPreview(
      day([
        MAIN("1", "08:30", "09:10", { status: "cancelled" }),
        MAIN("2", "09:20", "10:00", { status: "substituted" }),
        MAIN("3", "10:10", "10:50"),
      ]),
    );
    expect(p?.start).toBe("09:20");
    expect(p?.first.period).toBe("2");
    expect(p?.lessonCount).toBe(2);
    expect(p?.changedCount).toBe(2);
  });

  it("is null without data or lessons", () => {
    expect(tomorrowPreview(null)).toBeNull();
    expect(tomorrowPreview(day([]))).toBeNull();
  });
});
