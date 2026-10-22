import { describe, expect, it } from "vitest";
import { pairByGroup } from "@/lib/schedule";
import type { ResolvedLesson } from "@/lib/edupage";

const lesson = (period: string, group: string | null, span = 1) =>
  ({ period, group, span }) as unknown as ResolvedLesson;

describe("pairByGroup", () => {
  it("pairs two groups' lessons in one period, lower group on the left", () => {
    const g2 = lesson("2", "2");
    const g1 = lesson("2", "1");
    expect(pairByGroup([g2, g1])).toEqual([[g1, g2]]);
  });

  it("leaves whole-class lessons and different periods alone, keeping order", () => {
    const a = lesson("1", null);
    const b = lesson("2", "1");
    const c = lesson("3", "2");
    expect(pairByGroup([a, b, c])).toEqual([a, b, c]);
  });

  it("does not pair lessons of different spans or the same group", () => {
    const a = lesson("2", "1", 2);
    const b = lesson("2", "2", 1);
    expect(pairByGroup([a, b])).toEqual([a, b]);
    const c = lesson("3", "1");
    const d = lesson("3", "1");
    expect(pairByGroup([c, d])).toEqual([c, d]);
  });

  it("leaves three concurrent lessons stacked", () => {
    const l = [lesson("2", "1"), lesson("2", "2"), lesson("2", "3")];
    expect(pairByGroup(l)).toEqual(l);
  });
});
