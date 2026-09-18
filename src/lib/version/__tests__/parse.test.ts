import { describe, expect, it } from "vitest";
import { compareVersions, parseVersion } from "@/lib/version";

describe("parseVersion", () => {
  it("strips a leading v and a trailing -word suffix", () => {
    expect(parseVersion("v0.0.1-alpha")).toEqual([0, 0, 1]);
    expect(parseVersion("v1.2.3-beta")).toEqual([1, 2, 3]);
    expect(parseVersion("v1.2.3-rc1")).toEqual([1, 2, 3]);
  });

  it("works without a v prefix or a suffix", () => {
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
  });

  it("returns null for garbage input", () => {
    expect(parseVersion("")).toBeNull();
    expect(parseVersion("not-a-version")).toBeNull();
    expect(parseVersion("v1.x.3")).toBeNull();
  });
});

describe("compareVersions", () => {
  it("orders by major, then minor, then patch", () => {
    expect(compareVersions([1, 0, 0], [0, 9, 9])).toBe(1);
    expect(compareVersions([0, 1, 0], [0, 2, 0])).toBe(-1);
    expect(compareVersions([0, 0, 1], [0, 0, 1])).toBe(0);
  });

  it("treats a missing trailing part as 0", () => {
    expect(compareVersions([1, 2], [1, 2, 0])).toBe(0);
    expect(compareVersions([1, 2, 1], [1, 2])).toBe(1);
  });
});
