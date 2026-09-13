/**
 * Timetable selection — MODEL.md §3. The fixture's four published timetables cover two
 * weeks × two buildings, which is exactly the case that makes tt_num ambiguous.
 */
import { describe, expect, it } from "vitest";
import { FIXTURES, readJsonFixture } from "./fixtures.ts";
import { listBuildings, selectTimetable, selectTimetables } from "../select.ts";
import { toTimetableMeta } from "../normalize.ts";
import type { RawTimetableListEntry } from "../client.ts";

type RawViewer = {
  r: { regular: { default_num: string; timetables: RawTimetableListEntry[] } };
};

const raw = readJsonFixture<RawViewer>(FIXTURES.ttviewer).r.regular;
const metas = raw.timetables
  .filter((t) => !t.hidden)
  .map((t) => toTimetableMeta(t, "2026-09-09T00:00:00.000Z"));

describe("the fixture's published set", () => {
  it("has two buildings across two weeks", () => {
    expect(metas).toHaveLength(4);
    expect(listBuildings(metas).sort()).toEqual(["Galvenā ēka", "TIC"]);
  });
});

describe("selectTimetable", () => {
  it("picks the current week for the requested building", () => {
    const sel = selectTimetable(metas, "2026-09-09", "Galvenā ēka");
    expect(sel?.meta.ttNum).toBe("1175");
    expect(sel?.stale).toBe(false);
  });

  it("picks a different tt_num for the same date in the other building", () => {
    expect(selectTimetable(metas, "2026-09-09", "TIC")?.meta.ttNum).toBe("1174");
  });

  it("agrees with the server's default_num for the current week + main building", () => {
    expect(selectTimetable(metas, "2026-09-09", "Galvenā ēka")?.meta.ttNum).toBe(raw.default_num);
  });

  it("picks the previous week for an earlier date", () => {
    expect(selectTimetable(metas, "2026-09-02", "Galvenā ēka")?.meta.ttNum).toBe("1172");
  });

  it("flags stale when next week is not published yet", () => {
    const sel = selectTimetable(metas, "2026-09-16", "Galvenā ēka");
    expect(sel?.meta.ttNum).toBe("1175"); // newest available
    expect(sel?.stale).toBe(true); // ...but it does not cover the date
  });

  it("flags stale for a date before anything was published", () => {
    const sel = selectTimetable(metas, "2026-08-01", "TIC");
    expect(sel?.stale).toBe(true);
  });

  it("returns null for an unknown building", () => {
    expect(selectTimetable(metas, "2026-09-09", "Nowhere")).toBeNull();
  });

  it("ignores the weekend gap inside a covered week", () => {
    // validTo is Friday; Saturday is not covered and must be reported as stale.
    expect(selectTimetable(metas, "2026-09-12", "Galvenā ēka")?.stale).toBe(true);
  });
});

describe("selectTimetables (automatic building mode)", () => {
  it("returns one selection per building, main building first", () => {
    const picks = selectTimetables(metas, "2026-09-09");
    expect(picks.map((p) => p.meta.ttNum)).toEqual(["1175", "1174"]);
  });

  it("narrows to the pinned building", () => {
    expect(selectTimetables(metas, "2026-09-09", "TIC").map((p) => p.meta.ttNum)).toEqual(["1174"]);
  });

  it("picks up a building that appears mid-year without any code change", () => {
    // RVT really did add "TIC Olaine" in the 14.09 week — the app must not need a release.
    const withNew = [
      ...metas,
      toTimetableMeta(
        {
          tt_num: "1177",
          text: "TIC Olaine 14.09.2026. (14. 09. - 18. 09. 2026)",
          datefrom: "2026-09-14",
          year: 2026,
        },
        "2026-09-14T00:00:00.000Z",
      ),
    ];
    const picks = selectTimetables(withNew, "2026-09-16");
    expect(picks.map((p) => p.meta.building)).toEqual(["Galvenā ēka", "TIC", "TIC Olaine"]);
    expect(picks.find((p) => p.meta.ttNum === "1177")?.stale).toBe(false);
  });

  it("falls back to a flat pick when no timetable is labelled with a building", () => {
    const unlabelled = metas.map((m) => ({ ...m, building: "" }));
    expect(selectTimetables(unlabelled, "2026-09-09")).toHaveLength(1);
  });

  it("returns nothing when there is nothing published", () => {
    expect(selectTimetables([], "2026-09-09")).toEqual([]);
  });
});
