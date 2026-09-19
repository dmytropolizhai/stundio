import { describe, expect, it } from "vitest";
import type { DaySubstitutions, Substitution } from "@/lib/edupage";
import {
  substitutionsChanged,
  teacherSubstitutionsChanged,
  teacherHasCoverDuty,
} from "@/lib/schedule";

const MINE = "1DP1";

const item = (over: Partial<Substitution> = {}): Substitution => ({
  date: "2026-09-09",
  className: "1DP1",
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
    expect(substitutionsChanged(day(), day({ fetchedAt: "2026-09-09T18:00:00.000Z" }), MINE)).toBe(
      false,
    );
  });

  it("is true when there was nothing cached before but the fetch has content", () => {
    expect(substitutionsChanged(null, day(), MINE)).toBe(true);
  });

  it("is false when both are null", () => {
    expect(substitutionsChanged(null, null, MINE)).toBe(false);
  });

  it("is false for a first-ever fetch of a day with nothing to report", () => {
    // `daysToRefresh` slides a new date into the window daily — its first fetch has no cached
    // "before", but an empty day shouldn't read as a change just because it was never cached.
    expect(substitutionsChanged(null, day({ notes: [], items: [] }), MINE)).toBe(false);
  });

  it("is false between two empty fetches of the same day", () => {
    expect(
      substitutionsChanged(day({ notes: [], items: [] }), day({ notes: [], items: [] }), MINE),
    ).toBe(false);
  });

  it("is true when a day goes from empty to having a substitution", () => {
    expect(substitutionsChanged(day({ notes: [], items: [] }), day(), MINE)).toBe(true);
  });

  it("is true when an item's content differs", () => {
    expect(substitutionsChanged(day(), day({ items: [item({ raw: "Aizvietošana" })] }), MINE)).toBe(
      true,
    );
  });

  it("is true when notes differ", () => {
    expect(substitutionsChanged(day(), day({ notes: ["Skolēnu sapulce"] }), MINE)).toBe(true);
  });

  it("ignores another class's substitutions entirely", () => {
    // The feed is school-wide: dozens of rows a day, almost none of them this user's. Before
    // this scoping every one of them fired a "your timetable changed" notification.
    const theirs = day({ items: [item({ className: "N3", raw: "Aizvietošana" })] });
    const alsoTheirs = day({ items: [item({ className: "N3", raw: "Atcelts" })] });
    expect(substitutionsChanged(theirs, alsoTheirs, MINE)).toBe(false);
  });

  it("is true when my class's row changes while another class's stays put", () => {
    const before = day({ items: [item(), item({ className: "N3" })] });
    const after = day({ items: [item({ raw: "Aizvietošana" }), item({ className: "N3" })] });
    expect(substitutionsChanged(before, after, MINE)).toBe(true);
  });

  it("is false when no class is selected", () => {
    expect(substitutionsChanged(null, day(), null)).toBe(false);
  });

  it("is false for an announcement aimed at a different group", () => {
    // Only the *relevant* half of the announcements counts, the same half the day view shows.
    const before = day({ items: [], notes: [] });
    const after = day({ items: [], notes: ["N3: ekskursija uz muzeju."] });
    expect(substitutionsChanged(before, after, MINE)).toBe(false);
  });
});

describe("teacherSubstitutionsChanged", () => {
  const TEACHER_KEY = "gene ķere";

  it("is false for identical day fetched again later", () => {
    const d = day({ items: [item({ teacher: "Gene Ķere" })] });
    expect(
      teacherSubstitutionsChanged(d, day({ items: [item({ teacher: "Ķere Gene" })], fetchedAt: "2026-09-09T18:00:00Z" }), TEACHER_KEY),
    ).toBe(false);
  });

  it("is true when nothing cached before and fetch has teacher items", () => {
    const d = day({ items: [item({ teacher: "Gene Ķere" })] });
    expect(teacherSubstitutionsChanged(null, d, TEACHER_KEY)).toBe(true);
  });

  it("is false when both are null", () => {
    expect(teacherSubstitutionsChanged(null, null, TEACHER_KEY)).toBe(false);
  });

  it("is false for first fetch when day has no items for this teacher", () => {
    const d = day({ items: [item({ teacher: "Jānis Bērziņš" })] });
    expect(teacherSubstitutionsChanged(null, d, TEACHER_KEY)).toBe(false);
  });

  it("is false when unrelated teacher's substitution changes", () => {
    const before = day({ items: [item({ teacher: "Jānis Bērziņš", raw: "A" })] });
    const after = day({ items: [item({ teacher: "Jānis Bērziņš", raw: "B" })] });
    expect(teacherSubstitutionsChanged(before, after, TEACHER_KEY)).toBe(false);
  });

  it("is true when teacher is assigned as substitute (teacher matches)", () => {
    const before = day({ items: [] });
    const after = day({ items: [item({ teacher: "Gene Ķere", teacherFrom: "Jānis Bērziņš" })] });
    expect(teacherSubstitutionsChanged(before, after, TEACHER_KEY)).toBe(true);
  });

  it("is true when teacher is being substituted for (teacherFrom matches)", () => {
    const before = day({ items: [] });
    const after = day({ items: [item({ teacher: "Jānis Bērziņš", teacherFrom: "Gene Ķere" })] });
    expect(teacherSubstitutionsChanged(before, after, TEACHER_KEY)).toBe(true);
  });

  it("is false when key is null", () => {
    const d = day({ items: [item({ teacher: "Gene Ķere" })] });
    expect(teacherSubstitutionsChanged(null, d, null)).toBe(false);
  });
});

describe("teacherHasCoverDuty", () => {
  const TEACHER_KEY = "gene ķere";

  it("is true when teacher is assigned to cover another teacher", () => {
    const d = day({
      items: [
        item({
          teacher: "Gene Ķere",
          teacherFrom: "Jānis Bērziņš",
          kind: "substitution",
        }),
      ],
    });
    expect(teacherHasCoverDuty(d, TEACHER_KEY)).toBe(true);
  });

  it("is true when kind is substitution and teacher matches even without teacherFrom", () => {
    const d = day({
      items: [
        item({
          teacher: "Gene Ķere",
          teacherFrom: null,
          kind: "substitution",
        }),
      ],
    });
    expect(teacherHasCoverDuty(d, TEACHER_KEY)).toBe(true);
  });

  it("is false for a cancellation where teacher is absent", () => {
    const d = day({
      items: [
        item({
          teacher: null,
          teacherFrom: "Gene Ķere",
          kind: "cancelled",
        }),
      ],
    });
    expect(teacherHasCoverDuty(d, TEACHER_KEY)).toBe(false);
  });

  it("is false for someone else's cover duty", () => {
    const d = day({
      items: [
        item({
          teacher: "Jānis Bērziņš",
          teacherFrom: "Other Teacher",
          kind: "substitution",
        }),
      ],
    });
    expect(teacherHasCoverDuty(d, TEACHER_KEY)).toBe(false);
  });

  it("is false for null day or null key", () => {
    expect(teacherHasCoverDuty(null, TEACHER_KEY)).toBe(false);
    expect(teacherHasCoverDuty(day(), null)).toBe(false);
  });
});

