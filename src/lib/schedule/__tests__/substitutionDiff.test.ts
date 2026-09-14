import { describe, expect, it } from "vitest";
import type { DaySubstitutions, Substitution } from "../../edupage/index.ts";
import { substitutionsChanged } from "../index.ts";

const item = (over: Partial<Substitution> = {}): Substitution => ({
  date: "2026-09-09",
  className: "10.A",
  group: null,
  periods: [1],
  isOriginalSlot: false,
  kind: "cancelled",
  subject: null,
  subjectFrom: null,
  teacher: null,
  teacherFrom: null,
  room: null,
  roomFrom: null,
  movedFromPeriod: null,
  movedToPeriod: null,
  movedFromDate: null,
  movedToDate: null,
  raw: "Atcelts",
  ...over,
});

const day = (over: Partial<DaySubstitutions> = {}): DaySubstitutions => ({
  date: "2026-09-09",
  mode: "classes",
  notes: [],
  items: [item()],
  fetchedAt: "2026-09-09T06:00:00.000Z",
  ...over,
});

describe("substitutionsChanged", () => {
  it("is false for the identical day fetched again later", () => {
    expect(substitutionsChanged(day(), day({ fetchedAt: "2026-09-09T18:00:00.000Z" }))).toBe(false);
  });

  it("is true when there was nothing cached before but the fetch has content", () => {
    expect(substitutionsChanged(null, day())).toBe(true);
  });

  it("is false when both are null", () => {
    expect(substitutionsChanged(null, null)).toBe(false);
  });

  it("is false for a first-ever fetch of a day with nothing to report", () => {
    // `daysToRefresh` slides a new date into the window daily — its first fetch has no cached
    // "before", but an empty day shouldn't read as a change just because it was never cached.
    expect(substitutionsChanged(null, day({ notes: [], items: [] }))).toBe(false);
  });

  it("is false between two empty fetches of the same day", () => {
    expect(substitutionsChanged(day({ notes: [], items: [] }), day({ notes: [], items: [] }))).toBe(
      false,
    );
  });

  it("is true when a day goes from empty to having a substitution", () => {
    expect(substitutionsChanged(day({ notes: [], items: [] }), day())).toBe(true);
  });

  it("is true when an item's content differs", () => {
    expect(substitutionsChanged(day(), day({ items: [item({ raw: "Aizvietošana" })] }))).toBe(true);
  });

  it("is true when notes differ", () => {
    expect(substitutionsChanged(day(), day({ notes: ["Skolēnu sapulce"] }))).toBe(true);
  });
});
