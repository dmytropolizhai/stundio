/**
 * The subject → design-system mapping.
 *
 * Both functions here exist because EduPage's own data does not fit the design system: it ships
 * an arbitrary hex where the DS wants one of six accents, and it leaves `short` as a copy of the
 * full name where the DS wants a 3-letter code.
 */
import { describe, expect, it } from "vitest";
import type { ResolvedLesson, SubjectRef } from "../../lib/edupage/index.ts";
import {
  SUBJECT_TONES,
  buildingNotice,
  lessonBuilding,
  subjectCode,
  subjectTone,
} from "../theme/colors.ts";

const subject = (partial: Partial<SubjectRef>): SubjectRef => ({
  id: "1",
  short: "",
  name: "",
  color: "",
  ...partial,
});

describe("subjectTone", () => {
  it("only ever returns one of the design system's six accents", () => {
    for (const short of ["PRG", "DTB", "MAT", "ANG", "WEB", "SPO", "x", "ĀĒĪ"]) {
      expect(SUBJECT_TONES).toContain(subjectTone(subject({ short })));
    }
  });

  it("gives the same subject the same colour every time", () => {
    const a = subjectTone(subject({ short: "Programmēšana" }));
    const b = subjectTone(subject({ short: "Programmēšana" }));
    expect(a).toBe(b);
  });

  it("ignores the id, so a weekly republish cannot recolour a subject", () => {
    const before = subjectTone(subject({ id: "11", short: "Matemātika" }));
    const after = subjectTone(subject({ id: "982", short: "Matemātika" }));
    expect(after).toBe(before);
  });

  it("falls back rather than throwing on a missing subject", () => {
    expect(SUBJECT_TONES).toContain(subjectTone(null));
    expect(SUBJECT_TONES).toContain(subjectTone(subject({})));
  });

  it("spreads a realistic timetable across more than one accent", () => {
    const names = [
      "Programmēšana",
      "Datu bāzes",
      "Matemātika",
      "Angļu valoda",
      "Web tehnoloģijas",
      "Sports",
      "Latviešu valoda",
      "Vēsture",
    ];
    const used = new Set(names.map((short) => subjectTone(subject({ short }))));
    expect(used.size).toBeGreaterThan(2);
  });
});

describe("subjectCode", () => {
  it("trusts a short code the school actually filled in", () => {
    expect(subjectCode(subject({ short: "PRG", name: "Programmēšana" }))).toBe("PRG");
  });

  it("builds an acronym when `short` is really the full name", () => {
    // RVT's actual data: `short` and `name` both carry the whole title.
    const full = "Informācijas un komunikācijas tehnoloģijas";
    expect(subjectCode(subject({ short: full, name: full }))).toBe("IKT");
  });

  it("skips the conjunctions that carry no identity", () => {
    const full = "Tehnoloģiju un inovāciju centrs Dārzciema ielā";
    expect(subjectCode(subject({ short: full, name: full }))).toBe("TIC");
  });

  it("skips the Roman numerals RVT uses to number course parts", () => {
    const full = "Latviešu valoda I un Literatūra I";
    expect(subjectCode(subject({ short: full, name: full }))).toBe("LVL");
  });

  it("takes the first letters of a one-word title", () => {
    expect(subjectCode(subject({ short: "Programmēšana", name: "Programmēšana" }))).toBe("PRO");
  });

  it("never returns an empty string", () => {
    expect(subjectCode(null)).toBe("—");
    expect(subjectCode(subject({}))).toBe("—");
  });

  it("stays short enough for a grid cell", () => {
    const titles = [
      "Sabiedrības un cilvēka drošība",
      "Valodas, kultūras izpratne un izpausmes",
      "Atslēdznieka darbi",
      "Sports un veselība",
    ];
    for (const title of titles) {
      expect(subjectCode(subject({ short: title, name: title })).length).toBeLessThanOrEqual(3);
    }
  });
});

const lesson = (partial: Partial<ResolvedLesson>): ResolvedLesson => ({
  period: "1",
  start: "08:30",
  end: "09:10",
  span: 1,
  subject: null,
  teachers: [],
  rooms: [],
  group: null,
  status: "normal",
  changeNote: null,
  ...partial,
});

describe("lessonBuilding", () => {
  it("says nothing on an ordinary main-building day", () => {
    const day = { building: "Galvenā ēka", buildings: ["Galvenā ēka"] };
    expect(lessonBuilding(day, lesson({ building: "Galvenā ēka" }))).toBeUndefined();
  });

  it("names the annex when the whole day is there", () => {
    const day = { building: "TIC", buildings: ["TIC"] };
    expect(lessonBuilding(day, lesson({ building: "TIC" }))).toBe("TIC");
  });

  it("labels every lesson on a day split across buildings", () => {
    const day = { building: "Galvenā ēka", buildings: ["Galvenā ēka", "TIC Olaine"] };
    expect(lessonBuilding(day, lesson({ building: "Galvenā ēka" }))).toBe("Galvenā ēka");
    expect(lessonBuilding(day, lesson({ building: "TIC Olaine" }))).toBe("TIC Olaine");
  });

  it("falls back to the day when a lesson carries no building", () => {
    const day = { building: "TIC", buildings: ["TIC"] };
    expect(lessonBuilding(day, lesson({}))).toBe("TIC");
  });

  it("still reads the annex address row, for when the annex week is not cached yet", () => {
    const address = "Tehnoloģiju un inovāciju centrs Dārzciema ielā";
    const day = { building: "Galvenā ēka", buildings: ["Galvenā ēka"] };
    expect(lessonBuilding(day, lesson({ subject: subject({ name: address }) }))).toBe("TIC");
  });
});

describe("buildingNotice", () => {
  it("stays quiet for a plain main-building day", () => {
    expect(buildingNotice({ buildings: ["Galvenā ēka"] })).toBeNull();
    expect(buildingNotice({ buildings: [] })).toBeNull();
  });

  it("announces an annex day", () => {
    expect(buildingNotice({ buildings: ["TIC"] })).toEqual(["TIC"]);
  });

  it("announces both halves of a split day, in the order they are attended", () => {
    expect(buildingNotice({ buildings: ["Galvenā ēka", "TIC"] })).toEqual(["Galvenā ēka", "TIC"]);
  });
});
