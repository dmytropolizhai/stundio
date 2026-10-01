import { describe, expect, it } from "vitest";
import type { SubstKind } from "@/lib/edupage";
import { periodRuns, substKindToStatus } from "../screens/changes-view/subst-status.ts";

describe("substKindToStatus", () => {
  it("maps every substitution kind onto a badge status", () => {
    expect(substKindToStatus("cancelled")).toBe("cancelled");
    expect(substKindToStatus("moved_in")).toBe("moved");
    expect(substKindToStatus("moved_out")).toBe("moved");
    expect(substKindToStatus("substitution")).toBe("substituted");
    expect(substKindToStatus("room_change")).toBe("room_change");
    expect(substKindToStatus("added")).toBe("added");
  });

  it("falls back to 'substituted' for kinds without a badge of their own", () => {
    expect(substKindToStatus("unknown" as SubstKind)).toBe("substituted");
  });
});

describe("periodRuns", () => {
  it("fuses consecutive periods and splits on gaps", () => {
    expect(periodRuns([9, 10, 11])).toEqual([[9, 10, 11]]);
    expect(periodRuns([4, 5, 10, 11, 12])).toEqual([
      [4, 5],
      [10, 11, 12],
    ]);
    expect(periodRuns([3])).toEqual([[3]]);
    expect(periodRuns([])).toEqual([]);
  });

  it("sorts and de-duplicates parser output", () => {
    expect(periodRuns([11, 9, 10, 10])).toEqual([[9, 10, 11]]);
  });
});
