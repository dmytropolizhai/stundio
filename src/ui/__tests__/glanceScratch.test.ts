import { describe, expect, it } from "vitest";
import {
  buildScratchMaskUri,
  scratchRatio,
  scratchStrokes,
} from "../screens/home-view/glance-scratch.ts";

describe("glance-scratch", () => {
  it("produces no strokes or mask at progress 0 or below", () => {
    expect(scratchRatio(0)).toBe(0);
    expect(scratchRatio(-0.4)).toBe(0);
    expect(scratchStrokes(0, "MAT->PRG")).toEqual([]);
    expect(buildScratchMaskUri(0, "MAT->PRG")).toBeNull();
  });

  it("grows monotonically in stroke count and coverage as progress approaches 1", () => {
    const early = scratchStrokes(0.12, "MAT->PRG");
    const mid = scratchStrokes(0.5, "MAT->PRG");
    const late = scratchStrokes(0.95, "MAT->PRG");

    expect(early.length).toBeGreaterThan(0);
    expect(mid.length).toBeGreaterThan(early.length);
    expect(late.length).toBeGreaterThan(mid.length);

    expect(scratchRatio(0.12)).toBeLessThan(scratchRatio(0.5));
    expect(scratchRatio(0.5)).toBeLessThan(scratchRatio(0.95));
    expect(scratchRatio(1)).toBe(1);
    expect(scratchRatio(1.5)).toBe(1);
  });

  it("is deterministic for a given lesson pair and varies across different pairs", () => {
    const first = buildScratchMaskUri(0.6, "MAT->PRG");
    const repeat = buildScratchMaskUri(0.6, "MAT->PRG");
    const other = buildScratchMaskUri(0.6, "FIZ->LVL");

    expect(first).not.toBeNull();
    expect(first).toBe(repeat);
    expect(first).not.toBe(other);
    expect(first).toMatch(/^url\("data:image\/svg\+xml,/);
  });

  it("supports the compact dock variant with a wide shallow viewBox", () => {
    const dockMask = buildScratchMaskUri(0.65, "MAT->PRG", "dock");
    expect(dockMask).not.toBeNull();
    expect(decodeURIComponent(dockMask ?? "")).toContain('viewBox="0 0 400 64"');
    expect(scratchStrokes(0.65, "MAT->PRG", "dock").length).toBeGreaterThan(10);
  });
});
