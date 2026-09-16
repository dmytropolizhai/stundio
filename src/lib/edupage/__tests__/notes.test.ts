import { describe, expect, it } from "vitest";
import {
  areTeachersEqual,
  buildLatvianStem,
  extractMentionedTeachers,
  extractTargetGroups,
  filterNotesForClass,
  getTeacherTokens,
  isNoteRelevantForClass,
  isTargetMatch,
  isTeacherMentionedInNote,
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
    expect(extractTargetGroups("Aicinām DP2-1 grupu uz pasākumu")).toEqual(["DP2-1"]);
    expect(extractTargetGroups("Izmaiņas DP grupās")).toEqual(["DP"]);
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

  it("does not treat a short independent general announcement as a group continuation", () => {
    const notes = ["N3 grupai 6 - stunda atcelta", "Bibliotēka šodien slēgta."];
    const { relevant, other } = filterNotesForClass(notes, "DP2-1");
    expect(relevant).toEqual(["Bibliotēka šodien slēgta."]);
    expect(other).toEqual(["N3 grupai 6 - stunda atcelta"]);
  });
});

describe("teacher matching", () => {
  it("extracts names and surnames while ignoring single-letter initials", () => {
    expect(getTeacherTokens("Baumane Egija")).toEqual(["Baumane", "Egija"]);
    expect(getTeacherTokens("Liene Elizabete Čakste")).toEqual(["Liene", "Elizabete", "Čakste"]);
    expect(getTeacherTokens("N. Tiltiņš")).toEqual(["Tiltiņš"]);
    expect(getTeacherTokens("Tiltiņš N.")).toEqual(["Tiltiņš"]);
  });

  it("builds Latvian stems for inflected names", () => {
    expect(buildLatvianStem("Tiltiņš")).toBe("Tiltiņ");
    expect(buildLatvianStem("Baumane")).toBe("Bauman");
    expect(buildLatvianStem("Salmiņa")).toBe("Salmiņ");
    expect(buildLatvianStem("Geislers")).toBe("Geisler");
    expect(buildLatvianStem("Sabanskis")).toBe("Sabansk");
    expect(buildLatvianStem("Atis")).toBe("Atis"); // <= 4 chars kept intact
  });

  it("determines teacher equality", () => {
    expect(areTeachersEqual("Baumane Egija", "Egija Baumane")).toBe(true);
    expect(areTeachersEqual("Tiltiņš Normunds", "N. Tiltiņš")).toBe(true);
    expect(areTeachersEqual("Baumane Egija", "Tiltiņš Normunds")).toBe(false);
  });

  it("identifies teacher mentioned in text", () => {
    expect(
      isTeacherMentionedInNote(
        "Skolotāji, kuri nepiedalās: Egija Baumane , Liene Elizabete Čakste , Olga Sabanska , Valda Salmiņa",
        "Baumane Egija",
      ),
    ).toBe(true);
    expect(
      isTeacherMentionedInNote(
        "Skolotāji, kuri nepiedalās: Egija Baumane , Liene Elizabete Čakste , Olga Sabanska , Valda Salmiņa",
        "Tiltiņš Normunds",
      ),
    ).toBe(false);
    expect(isTeacherMentionedInNote("sk. N. Tiltiņš.6 stunda brīva.", "Tiltiņš Normunds")).toBe(
      true,
    );
    expect(isTeacherMentionedInNote("Tiltiņš.6 stunda brīva.", "Tiltiņš Normunds")).toBe(true);
    expect(isTeacherMentionedInNote("sk. Tiltiņam 3. stunda atcelta", "Tiltiņš Normunds")).toBe(
      true,
    );
    expect(isTeacherMentionedInNote("sk. Salmiņai 2. stunda atcelta", "Salmiņa Valda")).toBe(true);
    expect(isTeacherMentionedInNote("sk. Būmanis slims", "Būmanis Agris")).toBe(true);
    expect(isTeacherMentionedInNote("Bibliotēka šodien slēgta.", "Baumane Egija")).toBe(false);
  });

  it("extracts all mentioned teachers from a list", () => {
    const all = ["Baumane Egija", "Čakste Liene Elizabete", "Tiltiņš Normunds"];
    const note = "Aizvietošana pie sk. Čakstes un sk. Tiltiņa";
    expect(extractMentionedTeachers(note, all)).toEqual([
      "Čakste Liene Elizabete",
      "Tiltiņš Normunds",
    ]);
  });
});

describe("filterNotesForClass with teacher names & surnames", () => {
  const dp21Teachers = [
    "Būmanis Agris",
    "Drozda Lolita",
    "Kazakēviča Elita",
    "Lasinska Ingrīda",
    "Lazdiņa Mairita",
  ];
  const allTeachers = [
    ...dp21Teachers,
    "Baumane Egija",
    "Čakste Liene Elizabete",
    "Olga Sabanska",
    "Valda Salmiņa",
    "Tiltiņš Normunds",
  ];

  it("filters out absent teacher lists when none teach the selected class", () => {
    const notes = [
      "Skolotāji, kuri nepiedalās: Egija Baumane , Liene Elizabete Čakste , Olga Sabanska , Valda Salmiņa",
    ];
    const { relevant, other } = filterNotesForClass(
      notes,
      "DP2-1",
      ["DP2-1", "A1-2"],
      dp21Teachers,
      allTeachers,
    );
    expect(relevant).toEqual([]);
    expect(other).toEqual(notes);
  });

  it("keeps absent teacher list when one of the teachers teaches the class", () => {
    const a12Teachers = ["Čakste Liene Elizabete", "Edgars Geislers"];
    const notes = [
      "Skolotāji, kuri nepiedalās: Egija Baumane , Liene Elizabete Čakste , Olga Sabanska , Valda Salmiņa",
    ];
    const { relevant, other } = filterNotesForClass(
      notes,
      "A1-2",
      ["DP2-1", "A1-2"],
      a12Teachers,
      allTeachers,
    );
    expect(relevant).toEqual(notes);
    expect(other).toEqual([]);
  });

  it("filters out teacher-specific notices for other teachers", () => {
    const notes = ["sk. Tiltiņš slims, 3. stunda brīva"];
    const { relevant, other } = filterNotesForClass(
      notes,
      "DP2-1",
      ["DP2-1", "PRT4"],
      dp21Teachers,
      allTeachers,
    );
    expect(relevant).toEqual([]);
    expect(other).toEqual(notes);
  });

  it("keeps teacher-specific notices for the class's own teacher", () => {
    const notes = ["sk. Būmanis slims, 1. stunda atcelta"];
    const { relevant, other } = filterNotesForClass(
      notes,
      "DP2-1",
      ["DP2-1", "PRT4"],
      dp21Teachers,
      allTeachers,
    );
    expect(relevant).toEqual(notes);
    expect(other).toEqual([]);
  });

  it("gives explicit group targeting precedence over teacher mentions", () => {
    // Note explicitly targeted to DP2-1 mentioning teacher Čakste (who isn't their normal teacher)
    const notes = ["DP2-1 grupai 3. stunda pie sk. Čakstes"];
    const { relevant, other } = filterNotesForClass(
      notes,
      "DP2-1",
      ["DP2-1", "A1-2"],
      dp21Teachers,
      allTeachers,
    );
    expect(relevant).toEqual(notes);
    expect(other).toEqual([]);
  });

  it("keeps general school announcements alongside teacher filtering", () => {
    const notes = [
      "Skolas bibliotēka šodien slēgta.",
      "sk. Tiltiņš slims",
      "sk. Būmanis 2. stunda attālināti",
    ];
    const { relevant, other } = filterNotesForClass(
      notes,
      "DP2-1",
      ["DP2-1", "PRT4"],
      dp21Teachers,
      allTeachers,
    );
    expect(relevant).toEqual([
      "Skolas bibliotēka šodien slēgta.",
      "sk. Būmanis 2. stunda attālināti",
    ]);
    expect(other).toEqual(["sk. Tiltiņš slims"]);
  });

  it("correctly handles isNoteRelevantForClass with teachers", () => {
    expect(
      isNoteRelevantForClass(
        "sk. Būmanis slims",
        "DP2-1",
        ["DP2-1", "PRT4"],
        dp21Teachers,
        allTeachers,
      ),
    ).toBe(true);
    expect(
      isNoteRelevantForClass(
        "sk. Tiltiņš slims",
        "DP2-1",
        ["DP2-1", "PRT4"],
        dp21Teachers,
        allTeachers,
      ),
    ).toBe(false);
  });
});
