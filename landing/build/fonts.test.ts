import { describe, expect, it } from "vitest";
import { inRanges, parseUnicodeRange } from "./fonts.ts";

describe("unicode-range helpers", () => {
  const latinExt = parseUnicodeRange("U+0100-02BA,U+2C60-2C7F");

  it("parses ranges and single code points", () => {
    expect(parseUnicodeRange("U+0301,U+0400-045F")).toEqual([
      [0x301, 0x301],
      [0x400, 0x45f],
    ]);
  });

  it("puts Latvian macrons in latin-ext, not in basic Latin", () => {
    expect(inRanges("ā".codePointAt(0) ?? 0, latinExt)).toBe(true);
    expect(inRanges("a".codePointAt(0) ?? 0, latinExt)).toBe(false);
  });
});
