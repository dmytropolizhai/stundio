import { describe, expect, it } from "vitest";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { dayBrief, minutesOf } from "@/lib/schedule";

const lesson = (period: string, start: string, end: string, over: Partial<ResolvedLesson> = {}) =>
  ({
    period,
    start,
    end,
    span: 1,
    subject: { id: `s${period}`, name: "Matemātika", short: "Mat", color: null },
    teachers: [],
    rooms: [],
    group: null,
    status: "normal",
    changeNote: null,
    original: null,
    ...over,
  }) as ResolvedLesson;

const day = (lessons: ResolvedLesson[], date = "2026-09-09"): ResolvedDay => ({
  date,
  weekday: "wed",
  classId: "-927",
  building: "Galvenā ēka",
  buildings: ["Galvenā ēka"],
  ttNum: "1175",
  lessons,
  notes: [],
  stale: false,
});

const at = (hhmm: string, date = "2026-09-09") => ({ date, minutes: minutesOf(hhmm) ?? 0 });

const DAY = day([
  lesson("1", "08:30", "09:50"),
  lesson("2", "10:00", "11:20", { status: "room_change" }),
  lesson("3", "12:00", "13:20"),
]);

describe("dayBrief", () => {
  it("is null without data", () => {
    expect(dayBrief(null, at("08:00"))).toBeNull();
  });

  it("calls a day with nothing taking place free, cancelled lessons included", () => {
    expect(dayBrief(day([]), at("08:00"))).toEqual({ kind: "free" });
    expect(
      dayBrief(day([lesson("1", "08:30", "09:50", { status: "cancelled" })]), at("08:00")),
    ).toEqual({ kind: "free" });
  });

  it("outlines the whole day before it starts", () => {
    expect(dayBrief(DAY, at("07:00"))).toEqual({
      kind: "ahead",
      lessonCount: 3,
      start: "08:30",
      end: "13:20",
      changedCount: 1,
    });
  });

  it("treats another date as not started, since it has no 'now'", () => {
    expect(dayBrief(DAY, at("12:30", "2026-09-08"))?.kind).toBe("ahead");
  });

  it("counts what is left, including the lesson on now", () => {
    expect(dayBrief(DAY, at("10:30"))).toEqual({
      kind: "ongoing",
      remaining: 2,
      end: "13:20",
      changedCount: 1,
    });
    expect(dayBrief(DAY, at("11:40"))).toMatchObject({ kind: "ongoing", remaining: 1 });
  });

  it("says the day is done once the last lesson ends", () => {
    expect(dayBrief(DAY, at("13:20"))).toEqual({ kind: "finished", end: "13:20" });
  });
});
