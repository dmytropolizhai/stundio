import { describe, expect, it } from "vitest";
import { startOfWeek, weekDates } from "../index.ts";

describe("startOfWeek", () => {
  it("returns the Monday of the same week", () => {
    expect(startOfWeek("2026-09-09")).toBe("2026-09-07"); // Wednesday
    expect(startOfWeek("2026-09-07")).toBe("2026-09-07"); // Monday itself
  });

  it("treats the weekend as the tail of the week just gone, not the start of the next", () => {
    expect(startOfWeek("2026-09-13")).toBe("2026-09-07"); // Sunday
  });

  it("crosses a month boundary", () => {
    expect(startOfWeek("2026-10-01")).toBe("2026-09-28");
  });
});

describe("weekDates", () => {
  it("is Monday to Friday", () => {
    expect(weekDates("2026-09-09")).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
    ]);
  });
});
