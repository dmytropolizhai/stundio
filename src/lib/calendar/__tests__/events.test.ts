import { describe, expect, it } from "vitest";
import type { ClassRef, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { buildCalendarEvents, eventsForRange } from "../events.ts";
import type { CalendarLabels } from "../types.ts";

const labels: CalendarLabels = {
  cancelled: "cancelled",
  moved: "moved",
  substituted: "substituted",
  roomChange: "room changed",
  added: "added",
  teachers: "Teachers",
  group: "Group",
  changeNote: "From school",
};

const lesson = (over: Partial<ResolvedLesson> = {}): ResolvedLesson => ({
  period: "1",
  start: "08:30",
  end: "09:10",
  span: 1,
  subject: { id: "s1", name: "Mathematics", short: "Mat" },
  teachers: [{ id: "t1", name: "Anna Bērziņa", short: "A. Bērziņa" }],
  rooms: [{ id: "r1", name: "101", short: "101" }],
  group: null,
  status: "normal",
  changeNote: null,
  ...over,
});

const day = (date: string, lessons: ResolvedLesson[]): ResolvedDay => ({
  date,
  weekday: "wed",
  classId: "c1",
  building: "Galvenā ēka",
  buildings: ["Galvenā ēka"],
  ttNum: "1",
  lessons,
  notes: [],
  stale: false,
});

const build = (lessons: ResolvedLesson[], date = "2026-09-09") =>
  buildCalendarEvents([day(date, lessons)], labels, "7a");

describe("buildCalendarEvents", () => {
  it("returns nothing for empty input", () => {
    expect(buildCalendarEvents([], labels, "7a")).toEqual([]);
    expect(build([])).toEqual([]);
  });

  it("maps a normal lesson", () => {
    const [e] = build([lesson()]);
    expect(e).toMatchObject({
      uid: "7a-2026-09-09-1-all-s1@stundio",
      date: "2026-09-09",
      start: "08:30",
      end: "09:10",
      title: "Mathematics",
      location: "101",
      change: "none",
      sequence: 0,
    });
    expect(e?.description).toBe("Teachers: Anna Bērziņa");
  });

  it("keeps a cancelled lesson, marked in the title", () => {
    const [e] = build([lesson({ status: "cancelled", changeNote: "Skolotājs slims" })]);
    expect(e?.change).toBe("cancelled");
    expect(e?.sequence).toBe(1);
    expect(e?.title).toBe("⚠ Mathematics (cancelled)");
    expect(e?.description).toContain("From school: Skolotājs slims");
  });

  it("keeps a vacated, moved-out slot as moved", () => {
    const [e] = build([lesson({ status: "moved", movedTo: { date: "2026-09-11", period: "3" } })]);
    expect(e?.change).toBe("moved");
    expect(e?.title).toContain("(moved)");
    expect(e?.description).toContain("moved: 2026-09-11 (3)");
  });

  it("describes a substitution with the original teacher and room", () => {
    const [e] = build([
      lesson({
        status: "substituted",
        original: {
          subject: { id: "s2", name: "Physics", short: "Fiz" },
          teachers: [{ id: "t2", name: "Jānis Ozols", short: "J. Ozols" }],
        },
        changeNote: "(Fizika) ➔ Matemātika",
      }),
    ]);
    expect(e?.change).toBe("substituted");
    expect(e?.sequence).toBe(1);
    expect(e?.description).toContain("Physics · Jānis Ozols");
    expect(e?.description).toContain("From school: (Fizika) ➔ Matemātika");
  });

  it("handles room_change and added", () => {
    const [r, a] = build([
      lesson({ status: "room_change", original: { rooms: [{ id: "r9", name: "9", short: "9" }] } }),
      lesson({ period: "2", start: "09:20", end: "10:00", status: "added" }),
    ]);
    expect(r?.change).toBe("room_change");
    expect(r?.description).toContain("room changed");
    expect(r?.description).toContain("\n9");
    expect(a?.change).toBe("added");
    expect(a?.sequence).toBe(1);
  });

  it("falls back to group, then ?, when the subject is missing", () => {
    const [a, b] = build([
      lesson({ subject: null, group: "2" }),
      lesson({ period: "2", start: "09:20", end: "10:00", subject: null }),
    ]);
    expect(a?.title).toBe("2");
    expect(a?.uid).toBe("7a-2026-09-09-1-2-x@stundio");
    expect(b?.title).toBe("?");
  });

  it("gives two subgroup lessons in one period different uids", () => {
    const events = build([
      lesson({ group: "1", subject: { id: "s1", name: "English", short: "En" } }),
      lesson({ group: "2", subject: { id: "s3", name: "German", short: "De" } }),
    ]);
    expect(new Set(events.map((e) => e.uid)).size).toBe(2);
    expect(events[0]?.description).toContain("Group: 1");
  });

  it("never collides even for an identical slot, and stays deterministic", () => {
    const l = [lesson({ status: "moved" }), lesson({ status: "added" })];
    const a = build(l);
    expect(new Set(a.map((e) => e.uid)).size).toBe(2);
    expect(build(l).map((e) => e.uid)).toEqual(a.map((e) => e.uid));
  });

  it("sanitises the uid", () => {
    const [e] = buildCalendarEvents(
      [day("2026-09-09", [lesson({ subject: { id: "*1 é", name: "X", short: "X" } })])],
      labels,
      "a b",
    );
    expect(e?.uid).toMatch(/^[A-Za-z0-9._@-]+$/);
  });

  it("is stable across calls", () => {
    const input = [day("2026-09-09", [lesson(), lesson({ period: "2" })])];
    expect(buildCalendarEvents(input, labels, "7a")).toEqual(
      buildCalendarEvents(input, labels, "7a"),
    );
  });

  it("sorts by date, start, then uid", () => {
    const events = buildCalendarEvents(
      [
        day("2026-09-10", [lesson()]),
        day("2026-09-09", [
          lesson({ period: "2", start: "09:20", end: "10:00" }),
          lesson({ group: "2" }),
          lesson({ group: "1" }),
        ]),
      ],
      labels,
      "7a",
    );
    expect(events.map((e) => `${e.date} ${e.start} ${e.uid}`)).toEqual([
      "2026-09-09 08:30 7a-2026-09-09-1-1-s1@stundio",
      "2026-09-09 08:30 7a-2026-09-09-1-2-s1@stundio",
      "2026-09-09 09:20 7a-2026-09-09-2-all-s1@stundio",
      "2026-09-10 08:30 7a-2026-09-10-1-all-s1@stundio",
    ]);
  });

  it("leads with group · room in teacher mode, subject in the description", () => {
    const classes = [{ id: "c1", name: "10A", short: "10A" }] as ClassRef[];
    const [e] = build([lesson({ classes, role: "own", coverFor: null })]);
    expect(e?.title).toBe("10A · 101");
    expect(e?.description.split("\n")[0]).toBe("Mathematics");
  });

  it("falls back to the subject for a teacher lesson with no classes or rooms", () => {
    const [e] = build([lesson({ role: "cover", rooms: [], isCover: true })]);
    expect(e?.title).toBe("Mathematics");
    expect(e?.location).toBe("");
  });
});

describe("eventsForRange", () => {
  const resolve = (date: string) => day(date, [lesson()]);

  it("iterates inclusively and skips weekends", () => {
    // Fri 2026-09-11 .. Tue 2026-09-15
    const events = eventsForRange({ from: "2026-09-11", to: "2026-09-15" }, resolve, labels, "7a");
    expect(events.map((e) => e.date)).toEqual(["2026-09-11", "2026-09-14", "2026-09-15"]);
  });

  it("skips null days and crosses month and year ends", () => {
    const events = eventsForRange(
      { from: "2026-12-31", to: "2027-01-04" },
      (d) => (d === "2027-01-01" ? null : resolve(d)),
      labels,
      "7a",
    );
    expect(events.map((e) => e.date)).toEqual(["2026-12-31", "2027-01-04"]);
  });

  it("returns nothing for an inverted range", () => {
    expect(eventsForRange({ from: "2026-09-15", to: "2026-09-11" }, resolve, labels, "7a")).toEqual(
      [],
    );
  });
});
