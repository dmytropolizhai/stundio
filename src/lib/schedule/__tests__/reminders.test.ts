import { describe, expect, it } from "vitest";
import type { ResolvedDay, ResolvedLesson } from "../../edupage/index.ts";
import { lessonReminders, rigaTimeToDate } from "../index.ts";

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
  ttNum: "1175",
  lessons,
  notes: [],
  stale: false,
});

describe("rigaTimeToDate", () => {
  it("round-trips through rigaClock for a September (UTC+3) reading", () => {
    const at = rigaTimeToDate("2026-09-09", 8 * 60 + 30);
    expect(at.toISOString()).toBe("2026-09-09T05:30:00.000Z");
  });

  it("round-trips through rigaClock for a January (UTC+2) reading", () => {
    const at = rigaTimeToDate("2026-01-09", 8 * 60 + 30);
    expect(at.toISOString()).toBe("2026-01-09T06:30:00.000Z");
  });
});

describe("lessonReminders", () => {
  const DAY = day([
    lesson({ period: "1", start: "08:30", end: "09:10" }),
    lesson({ period: "2", start: "09:20", end: "10:00" }),
    lesson({ period: "3", start: "10:10", end: "10:50", status: "cancelled" }),
  ]);

  it("is off when minutesBefore is 0", () => {
    expect(lessonReminders(DAY, 0, new Date("2026-09-09T00:00:00Z"))).toEqual([]);
  });

  it("plans one reminder per remaining lesson, skipping cancelled ones", () => {
    const reminders = lessonReminders(DAY, 10, new Date("2026-09-09T00:00:00Z"));
    expect(reminders.map((r) => r.lesson.period)).toEqual(["1", "2"]);
    // Period 1 starts 08:30 Riga (UTC+3) -> 05:30 UTC, minus 10 minutes.
    expect(reminders[0]?.fireAt.toISOString()).toBe("2026-09-09T05:20:00.000Z");
  });

  it("drops a reminder whose fire time has already passed", () => {
    const reminders = lessonReminders(DAY, 10, new Date("2026-09-09T05:25:00Z"));
    expect(reminders.map((r) => r.lesson.period)).toEqual(["2"]);
  });

  it("gives the same id for the same (date, period) across calls", () => {
    const now = new Date("2026-09-09T00:00:00Z");
    const first = lessonReminders(DAY, 10, now);
    const second = lessonReminders(DAY, 10, now);
    expect(first.map((r) => r.id)).toEqual(second.map((r) => r.id));
  });
});
