/**
 * The home-screen tile is the one surface nobody can tap to correct, so these run against the
 * real 2026-09-09 fixtures rather than hand-made lessons: whatever `resolveDay` produces for a
 * live class is what the widget has to render, cancelled slots and all.
 */
import { describe, expect, it } from "vitest";
import {
  FIXTURE_DATE,
  FIXTURES,
  readFixture,
  readJsonFixture,
} from "../../edupage/__tests__/fixtures.ts";
import { normalizeTimetable, toTimetableMeta, type RawTables } from "../../edupage/normalize.ts";
import { parseDaySubstitutions } from "../../edupage/substitutions.ts";
import { resolveDay } from "../../edupage/resolve.ts";
import type { ResolvedDay, ResolvedLesson, Timetable } from "../../edupage/types.ts";
import { minutesOf } from "../../schedule/index.ts";
import { buildWidgetPayload } from "../index.ts";
import type { WidgetStrings } from "../index.ts";

type RawRegular = { r: { dbiAccessorRes: { tables: { id: string; data_rows?: unknown[] }[] } } };

const tables: RawTables = Object.fromEntries(
  readJsonFixture<RawRegular>(FIXTURES.regulartt).r.dbiAccessorRes.tables.map((t) => [
    t.id,
    (t.data_rows ?? []) as Record<string, unknown>[],
  ]),
);

const timetable: Timetable = normalizeTimetable(
  tables,
  toTimetableMeta(
    {
      tt_num: "1175",
      text: "Galvenā ēka 07.09.2026. (07. 09. - 11. 09. 2026)",
      datefrom: "2026-09-07",
      year: 2026,
    },
    "2026-09-09T00:00:00.000Z",
  ),
).timetable;

const subs = parseDaySubstitutions(
  readFixture(FIXTURES.substHtml),
  FIXTURE_DATE,
  "2026-09-09T00:00:00.000Z",
);

/** The first class the fixture day gives a non-cancelled, properly timed lesson. */
const fixtureDay = (): ResolvedDay => {
  for (const cls of timetable.classes) {
    const day = resolveDay(timetable, subs, cls.id, FIXTURE_DATE);
    const usable = day.lessons.some(
      (l) => l.status !== "cancelled" && minutesOf(l.start) !== null && l.subject !== null,
    );
    if (usable) return day;
  }
  throw new Error("no usable class in the fixture day");
};

const DAY = fixtureDay();
const FIRST: ResolvedLesson = DAY.lessons.filter(
  (l) => l.status !== "cancelled" && minutesOf(l.start) !== null,
)[0]!;

const STRINGS: WidgetStrings = {
  now: "Now",
  next: "Next",
  done: "No more lessons today",
  noClass: "Pick a class",
  noData: "Open Stundio to refresh",
  minutesLeft: (m) => `${m} min left`,
  minutesUntil: (m) => `in ${m} min`,
};

const UPDATED = new Date("2026-09-09T05:00:00.000Z");
const at = (hhmm: string, date = FIXTURE_DATE) => ({ date, minutes: minutesOf(hhmm) ?? 0 });

const build = (over: Partial<Parameters<typeof buildWidgetPayload>[0]> = {}) =>
  buildWidgetPayload({
    day: DAY,
    now: at("00:00"),
    className: "A1-1",
    strings: STRINGS,
    updatedAt: UPDATED,
    ...over,
  });

describe("buildWidgetPayload", () => {
  it("stamps the schema version and the write time on every payload", () => {
    const payload = build({ className: null });
    expect(payload.version).toBe(1);
    expect(payload.updatedAt).toBe(UPDATED.toISOString());
  });

  it("asks for a class before anything else — an unconfigured app has no day to show", () => {
    const payload = build({ className: null, day: null });
    expect(payload.state).toBe("no-class");
    expect(payload.title).toBe("Pick a class");
    expect(payload.subtitle).toBe("");
    expect(payload.minutesUntilChange).toBeNull();
  });

  it("says the cache is empty when a class is picked but nothing resolved", () => {
    const payload = build({ day: null });
    expect(payload.state).toBe("no-data");
    expect(payload.title).toBe("Open Stundio to refresh");
  });

  it("headlines the upcoming lesson before the day starts", () => {
    const payload = build({ now: at("00:00") });

    expect(payload.state).toBe("upcoming");
    expect(payload.label).toBe("Next");
    expect(payload.title).toBe(FIRST.subject?.short);
    expect(payload.subtitle).toContain(`${FIRST.start}–${FIRST.end}`);
    expect(payload.subtitle).toContain("A1-1");
    expect(payload.countdown).toBe(`in ${minutesOf(FIRST.start)} min`);
    expect(payload.minutesUntilChange).toBe(minutesOf(FIRST.start));
  });

  it("switches to the live lesson once its window opens, counting down to its end", () => {
    const payload = build({ now: at(FIRST.start) });

    expect(payload.state).toBe("live");
    expect(payload.label).toBe("Now");
    expect(payload.countdown).toBe(`${minutesOf(FIRST.end)! - minutesOf(FIRST.start)!} min left`);
    expect(payload.minutesUntilChange).toBe(minutesOf(FIRST.end)! - minutesOf(FIRST.start)!);
  });

  it("falls back to a finished day after the last lesson, keeping the class visible", () => {
    const payload = build({ now: at("23:59") });

    expect(payload.state).toBe("done");
    expect(payload.title).toBe("No more lessons today");
    expect(payload.subtitle).toBe("A1-1");
    expect(payload.countdown).toBe("");
    expect(payload.accent).toBeNull();
  });

  it("treats a day that is not today as nothing to show — a widget must not guess a 'now'", () => {
    expect(build({ now: at("09:00", "2026-09-10") }).state).toBe("done");
  });

  it("never headlines a cancelled lesson", () => {
    const cancelled = DAY.lessons.find((l) => l.status === "cancelled");
    if (cancelled === undefined) return; // the fixture day always has some, but don't assume
    const payload = build({ now: at(cancelled.start) });
    expect(payload.title).not.toBe(cancelled.subject?.short ?? "—");
  });
});

describe("buildWidgetPayload — display details", () => {
  const lesson = (over: Partial<ResolvedLesson>): ResolvedLesson => ({
    period: "1",
    start: "08:30",
    end: "09:10",
    span: 1,
    subject: { id: "s1", name: "Matemātika", short: "Mat", color: "#14C030" },
    teachers: [],
    rooms: [{ id: "r1", name: "210", short: "210" }],
    group: null,
    status: "normal",
    changeNote: null,
    original: null,
    ...over,
  });

  const dayOf = (l: ResolvedLesson): ResolvedDay => ({
    ...DAY,
    lessons: [l],
  });

  it("carries the subject colour through as the accent rail", () => {
    expect(build({ day: dayOf(lesson({})), now: at("08:00") }).accent).toBe("#14C030");
  });

  it("drops an accent that is not a usable hex colour", () => {
    const subject = { id: "s1", name: "M", short: "Mat", color: "rebeccapurple" };
    expect(build({ day: dayOf(lesson({ subject })), now: at("08:00") }).accent).toBeNull();
  });

  it("falls back through short → name → an em dash, so the headline is never blank", () => {
    const noShort = { id: "s1", name: "Matemātika", short: "", color: null };
    expect(build({ day: dayOf(lesson({ subject: noShort })), now: at("08:00") }).title).toBe(
      "Matemātika",
    );
    const nameless = { id: "s1", name: "", short: "", color: null };
    expect(build({ day: dayOf(lesson({ subject: nameless })), now: at("08:00") }).title).toBe("—");
    expect(build({ day: dayOf(lesson({ subject: null })), now: at("08:00") }).title).toBe("—");
  });

  it("assembles the subtitle from whatever parts exist", () => {
    expect(build({ day: dayOf(lesson({})), now: at("08:00") }).subtitle).toBe(
      "08:30–09:10 · 210 · A1-1",
    );
    expect(build({ day: dayOf(lesson({ rooms: [] })), now: at("08:00") }).subtitle).toBe(
      "08:30–09:10 · A1-1",
    );
    expect(
      build({ day: dayOf(lesson({ rooms: [] })), now: at("08:00"), className: "" }).subtitle,
    ).toBe("08:30–09:10");
  });

  it("falls back to a room's full name when EduPage published no short code", () => {
    const rooms = [{ id: "r1", name: "Aktu zāle", short: "" }];
    expect(build({ day: dayOf(lesson({ rooms })), now: at("08:00") }).subtitle).toBe(
      "08:30–09:10 · Aktu zāle · A1-1",
    );
  });
});

describe("buildWidgetPayload — progress bar", () => {
  it("is null before and after the live lesson, and a rounded percentage during it", () => {
    expect(build({ now: at("00:00") }).progressPercent).toBeNull();
    expect(build({ now: at("23:59") }).progressPercent).toBeNull();

    const midpoint = minutesOf(FIRST.start)! + (minutesOf(FIRST.end)! - minutesOf(FIRST.start)!) / 2;
    const payload = build({ now: { date: FIXTURE_DATE, minutes: midpoint } });
    expect(payload.state).toBe("live");
    expect(payload.progressPercent).toBe(50);
  });
});

describe("buildWidgetPayload — the all-day list", () => {
  it("is empty in every empty state", () => {
    expect(build({ className: null }).today).toEqual([]);
    expect(build({ day: null }).today).toEqual([]);
  });

  it("is empty for a day that is not today", () => {
    expect(build({ now: at("09:00", "2026-09-10") }).today).toEqual([]);
  });

  it("lists every timed lesson, marking each done, live or upcoming from the clock", () => {
    const before = build({ now: at(FIRST.start) }).today;
    expect(before.length).toBeGreaterThan(0);
    expect(before[0]).toMatchObject({
      time: `${FIRST.start}–${FIRST.end}`,
      title: FIRST.subject?.short,
      state: "live",
    });
    expect(before.some((e) => e.state === "upcoming")).toBe(true);

    const after = build({ now: at("23:59") }).today;
    expect(after.every((e) => e.state === "done")).toBe(true);
  });
});
