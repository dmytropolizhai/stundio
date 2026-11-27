import { describe, expect, it } from "vitest";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { weekPeriods } from "@/lib/schedule";
import {
  buildDayEvents,
  computeCalendarBounds,
  dayChangeCount,
  formatMinuteLabel,
  visiblePeriodTicks,
} from "../screens/week-view/week-calendar-layout.ts";

const makeLesson = (overrides: Partial<ResolvedLesson> = {}): ResolvedLesson => ({
  period: "1",
  start: "08:30",
  end: "09:10",
  span: 1,
  subject: { id: "s1", name: "Matemātika", short: "MAT" },
  teachers: [{ id: "t1", name: "Jānis Bērziņš", short: "Bērziņš" }],
  rooms: [{ id: "r1", name: "204", short: "204" }],
  group: null,
  status: "normal",
  changeNote: null,
  ...overrides,
});

const makeDay = (date: string, lessons: ResolvedLesson[]): ResolvedDay => ({
  date,
  weekday: "mon",
  classId: "c1",
  building: "Galvenā ēka",
  buildings: ["Galvenā ēka"],
  ttNum: "1",
  lessons,
  notes: [],
  stale: false,
});

describe("week-calendar-layout", () => {
  it("formats minutes into 24h HH:MM labels", () => {
    expect(formatMinuteLabel(8 * 60)).toBe("08:00");
    expect(formatMinuteLabel(13 * 60 + 5)).toBe("13:05");
    expect(formatMinuteLabel(-10)).toBe("00:00");
  });

  it("computes proportional minute bounds, hour ticks, and long-break bands", () => {
    const day = makeDay("2026-09-07", [
      makeLesson({ period: "1", start: "08:30", end: "09:10" }),
      makeLesson({ period: "2", start: "09:15", end: "09:55" }),
      makeLesson({ period: "3", start: "10:25", end: "11:05" }),
    ]);
    const periods = weekPeriods([day]);
    const bounds = computeCalendarBounds([day], periods);

    expect(bounds.startMin).toBeLessThanOrEqual(8 * 60 + 15);
    expect(bounds.endMin).toBeGreaterThanOrEqual(11 * 60 + 25);
    expect(bounds.hourTicks).toContain(9 * 60);
    expect(bounds.hourTicks).toContain(10 * 60);
    expect(bounds.breakBands).toHaveLength(1);
    expect(bounds.breakBands[0]).toMatchObject({
      periodAfter: "3",
      startMin: 9 * 60 + 55,
      endMin: 10 * 60 + 25,
      minutes: 30,
    });
  });

  it("coalesces consecutive identical lessons when mergeConsecutive is true", () => {
    const first = makeLesson({ period: "1", start: "08:30", end: "09:10" });
    const second = makeLesson({ period: "2", start: "09:15", end: "09:55" });
    const other = makeLesson({
      period: "3",
      start: "10:10",
      end: "10:50",
      subject: { id: "s2", name: "Fizika", short: "FIZ" },
    });
    const day = makeDay("2026-09-07", [first, second, other]);

    const unmerged = buildDayEvents(day, "2026-09-07", {
      mergeConsecutive: false,
      liveLesson: null,
    });
    expect(unmerged).toHaveLength(3);
    expect(unmerged[0]?.periodLabel).toBe("1");

    const merged = buildDayEvents(day, "2026-09-07", {
      mergeConsecutive: true,
      liveLesson: null,
    });
    expect(merged).toHaveLength(2);
    expect(merged[0]?.periodLabel).toBe("1–2");
    expect(merged[0]?.end).toBe("09:55");
    expect(merged[0]?.endMin).toBe(9 * 60 + 55);
  });

  it("places paired subgroup lessons side-by-side with half 0 and 1", () => {
    const g1 = makeLesson({
      period: "1",
      start: "08:30",
      end: "09:10",
      group: "1",
      subject: { id: "s1", name: "Angļu valoda", short: "ANG" },
    });
    const g2 = makeLesson({
      period: "1",
      start: "08:30",
      end: "09:10",
      group: "2",
      subject: { id: "s2", name: "Vācu valoda", short: "VĀC" },
    });
    const day = makeDay("2026-09-07", [g1, g2]);

    const events = buildDayEvents(day, "2026-09-07", {
      mergeConsecutive: false,
      liveLesson: g2,
    });

    expect(events).toHaveLength(2);
    expect(events[0]?.half).toBe(0);
    expect(events[0]?.live).toBe(false);
    expect(events[1]?.half).toBe(1);
    expect(events[1]?.live).toBe(true);
    expect(events[0]?.pairKey).toBe(events[1]?.pairKey);
  });

  it("splits overlapping un-paired lessons side-by-side with unique keys", () => {
    const cancelled = makeLesson({
      period: "1",
      start: "08:30",
      end: "09:10",
      status: "cancelled",
      subject: { id: "s1", name: "Fizika", short: "FIZ" },
    });
    const replacement = makeLesson({
      period: "1",
      start: "08:30",
      end: "09:10",
      status: "added",
      subject: { id: "s2", name: "Ķīmija", short: "ĶĪM" },
    });
    const day = makeDay("2026-09-07", [cancelled, replacement]);

    const events = buildDayEvents(day, "2026-09-07", {
      mergeConsecutive: false,
      liveLesson: null,
    });

    expect(events).toHaveLength(2);
    expect(events[0]?.key).not.toBe(events[1]?.key);
    expect(events[0]?.half).toBe(0);
    expect(events[1]?.half).toBe(1);
    expect(events[0]?.laneCount).toBe(2);
    expect(events[1]?.laneCount).toBe(2);
  });

  it("packs 3 overlapping lessons into 3 side-by-side lanes without covering each other", () => {
    const first = makeLesson({
      period: "1",
      start: "08:30",
      end: "09:10",
      group: "1",
      subject: { id: "s1", name: "Angļu valoda", short: "ANG" },
    });
    const second = makeLesson({
      period: "1",
      start: "08:30",
      end: "09:10",
      group: "2",
      subject: { id: "s2", name: "Vācu valoda", short: "VĀC" },
    });
    const third = makeLesson({
      period: "1",
      start: "08:30",
      end: "09:10",
      status: "cancelled",
      subject: { id: "s3", name: "Fizika", short: "FIZ" },
    });
    const day = makeDay("2026-09-07", [first, second, third]);

    const events = buildDayEvents(day, "2026-09-07", {
      mergeConsecutive: false,
      liveLesson: null,
    });

    expect(events).toHaveLength(3);
    expect(events.map((e) => e.lane)).toEqual([0, 1, 2]);
    expect(events.every((e) => e.laneCount === 3)).toBe(true);
    expect(events.every((e) => e.half === undefined)).toBe(true);
  });

  it("filters period ticks that would physically collide with whole-hour ticks on the time rail", () => {
    const hourTicks = [8 * 60, 9 * 60, 10 * 60];
    const periodTicks = [
      { period: "1", minutes: 8 * 60 + 30, start: "08:30", end: "09:10" },
      { period: "2", minutes: 9 * 60 + 55, start: "09:55", end: "10:35" }, // 5 min before 10:00 → collides!
      { period: "3", minutes: 10 * 60, start: "10:00", end: "10:40" }, // exact hour → skipped!
    ];

    const kept = visiblePeriodTicks(hourTicks, periodTicks, 2.0, 16);
    expect(kept.map((t) => t.start)).toEqual(["08:30"]);
  });

  it("counts distinct changed periods on a day", () => {
    const day = makeDay("2026-09-07", [
      makeLesson({ period: "1", status: "normal" }),
      makeLesson({ period: "2", status: "cancelled" }),
      makeLesson({ period: "2", status: "added" }),
      makeLesson({ period: "3", status: "room_change" }),
    ]);

    expect(dayChangeCount(null)).toBe(0);
    expect(dayChangeCount(day)).toBe(2);
  });
});
