import { describe, expect, it } from "vitest";
import {
  extractTargetGroups,
  filterNotesForClass,
  isNoteRelevantForClass,
  isTargetMatch,
  splitGroupAnnouncements,
} from "../notes.ts";

describe("splitGroupAnnouncements", () => {
  it("leaves single announcements intact", () => {
    expect(splitGroupAnnouncements("N3 grupai 6 - stunda atcelta, 7 stunda sports Sk.")).toEqual([
      "N3 grupai 6 - stunda atcelta, 7 stunda sports Sk.",
    ]);
  });

  it("splits concatenated group announcements missing terminal punctuation", () => {
    const input = "A3-1 grupai 4-5 stunda -pašvadīti AV2-1 grupai 10-12 stundai - pašvadīti.";
    expect(splitGroupAnnouncements(input)).toEqual([
      "A3-1 grupai 4-5 stunda -pašvadīti",
      "AV2-1 grupai 10-12 stundai - pašvadīti.",
    ]);
  });

  it("splits multi-group concatenated announcements", () => {
    const input =
      "VA1 grupai 7-9 stunda - pašvadīti AV3-1 grupai 6-8 stunda -pašvadīti EA4 grupai stundas pašvaditas N1 grupai 8-9 stunda -pašvadīti";
    expect(splitGroupAnnouncements(input)).toEqual([
      "VA1 grupai 7-9 stunda - pašvadīti",
      "AV3-1 grupai 6-8 stunda -pašvadīti",
      "EA4 grupai stundas pašvaditas",
      "N1 grupai 8-9 stunda -pašvadīti",
    ]);
  });

  it("handles empty strings", () => {
    expect(splitGroupAnnouncements("   ")).toEqual([]);
  });
});

describe("extractTargetGroups", () => {
  it("extracts single group with 'grupai'", () => {
    expect(extractTargetGroups("N3 grupai 6 - stunda atcelta, 7 stunda sports Sk.")).toEqual([
      "N3",
    ]);
  });

  it("extracts multiple groups with 'grupām'", () => {
    expect(extractTargetGroups("DP2-1, DP2-2 grupām sports")).toEqual(["DP2-1", "DP2-2"]);
    expect(extractTargetGroups("DP2-1 un DP2-2 grupām sports")).toEqual(["DP2-1", "DP2-2"]);
  });

  it("extracts group from leading colon / hyphen syntax", () => {
    expect(extractTargetGroups("DP2-1: 3. stunda atcelta")).toEqual(["DP2-1"]);
    expect(extractTargetGroups("DP2-1 - 3. stunda atcelta")).toEqual(["DP2-1"]);
  });

  it("finds known class in text when allClasses is supplied", () => {
    expect(extractTargetGroups("Konsultācija DP2-1 15:00", ["DP2-1", "N3"])).toEqual(["DP2-1"]);
  });

  it("returns empty array for general announcements", () => {
    expect(extractTargetGroups("Skolas bibliotēka šodien slēgta.")).toEqual([]);
  });
});

describe("isTargetMatch", () => {
  it("matches exact class name", () => {
    expect(isTargetMatch("DP2-1", "DP2-1")).toBe(true);
    expect(isTargetMatch("dp2-1", "DP2-1")).toBe(true);
  });

  it("matches year-level prefix before hyphen", () => {
    expect(isTargetMatch("DP2", "DP2-1")).toBe(true);
    expect(isTargetMatch("DP1", "DP2-1")).toBe(false);
  });

  it("matches programme-level letter prefix", () => {
    expect(isTargetMatch("DP", "DP2-1")).toBe(true);
    expect(isTargetMatch("PRT", "PRT1")).toBe(true);
    expect(isTargetMatch("PRT", "DP2-1")).toBe(false);
  });

  it("does not match different groups or subclasses", () => {
    expect(isTargetMatch("N3", "DP2-1")).toBe(false);
    expect(isTargetMatch("DP2-2", "DP2-1")).toBe(false);
    expect(isTargetMatch("SC2", "DP2-1")).toBe(false);
  });
});

describe("isNoteRelevantForClass", () => {
  it("keeps general school announcements for everyone", () => {
    expect(isNoteRelevantForClass("Bibliotēka šodien slēgta.", "DP2-1", ["DP2-1", "N3"])).toBe(
      true,
    );
  });

  it("excludes notes targeting another group", () => {
    expect(
      isNoteRelevantForClass("N3 grupai 6 - stunda atcelta, 7 stunda sports Sk.", "DP2-1", [
        "DP2-1",
        "N3",
      ]),
    ).toBe(false);
  });

  it("includes notes targeting the user's group", () => {
    expect(isNoteRelevantForClass("DP2-1 grupai 1. stunda atcelta", "DP2-1", ["DP2-1", "N3"])).toBe(
      true,
    );
  });
});

describe("filterNotesForClass", () => {
  const sampleNotes = [
    "SC2 grupai Sliežu ceļu virsbūves elementu uzturēšana 6-9 stunda - atcelta.",
    "Pārvedu un to elementu uzturēšana 10-11 stunda - atcelta.",
    "PRT grupai 1-4 stunda Iespieddarba ražošanas procesa plānošana, 5 stunda brīva.",
    "PRT4 grupai 5 stunda Iespieddarba ražošanas procesa nodrošināšana, kontrole un uzskaite sk.",
    "N.",
    "Tiltiņš.6 stunda brīva.",
    "N2-1 grupai 6. stunda- audzināšana.",
    "A4-2 grupai stundas pašvadītas.",
    "A3-2 grupai stundas pašvadītas.",
    "A4-1 grupai stundas pašvadītas.",
    "A3-1 grupai 4-5 stunda -pašvadīti AV2-1 grupai 10-12 stundai - pašvadīti.",
    "VA1 grupai 7-9 stunda - pašvadīti AV3-1 grupai 6-8 stunda -pašvadīti EA4 grupai stundas pašvaditas N1 grupai 8-9 stunda -pašvadīti",
  ];

  it("filters out all irrelevant notes for DP2-1", () => {
    const { relevant, other } = filterNotesForClass(sampleNotes, "DP2-1");
    expect(relevant).toEqual([]);
    expect(other.length).toBeGreaterThan(0);
  });

  it("filters the user's reported N3 note out for DP2-1", () => {
    const notes = ["N3 grupai 6 - stunda atcelta, 7 stunda sports Sk."];
    const { relevant, other } = filterNotesForClass(notes, "DP2-1");
    expect(relevant).toEqual([]);
    expect(other).toEqual(["N3 grupai 6 - stunda atcelta, 7 stunda sports Sk."]);
  });

  it("keeps the user's reported N3 note for N3", () => {
    const notes = ["N3 grupai 6 - stunda atcelta, 7 stunda sports Sk."];
    const { relevant, other } = filterNotesForClass(notes, "N3");
    expect(relevant).toEqual(["N3 grupai 6 - stunda atcelta, 7 stunda sports Sk."]);
    expect(other).toEqual([]);
  });

  it("keeps continuation lines for the targeted group (SC2)", () => {
    const { relevant } = filterNotesForClass(sampleNotes, "SC2");
    expect(relevant).toEqual([
      "SC2 grupai Sliežu ceļu virsbūves elementu uzturēšana 6-9 stunda - atcelta.",
      "Pārvedu un to elementu uzturēšana 10-11 stunda - atcelta.",
    ]);
  });

  it("keeps programme-level announcements for group in that programme", () => {
    const { relevant } = filterNotesForClass(sampleNotes, "PRT1");
    expect(relevant).toEqual([
      "PRT grupai 1-4 stunda Iespieddarba ražošanas procesa plānošana, 5 stunda brīva.",
    ]);
  });

  it("correctly extracts single note from concatenated string for AV2-1", () => {
    const { relevant } = filterNotesForClass(sampleNotes, "AV2-1");
    expect(relevant).toEqual(["AV2-1 grupai 10-12 stundai - pašvadīti."]);
  });

  it("always preserves general school announcements alongside relevant group notes", () => {
    const notes = [
      "Skolas bibliotēka šodien slēgta.",
      "DP2-1 grupai 1. stunda atcelta",
      "N3 grupai 6 - stunda atcelta",
    ];
    const { relevant, other } = filterNotesForClass(notes, "DP2-1");
    expect(relevant).toEqual([
      "Skolas bibliotēka šodien slēgta.",
      "DP2-1 grupai 1. stunda atcelta",
    ]);
    expect(other).toEqual(["N3 grupai 6 - stunda atcelta"]);
  });
});
