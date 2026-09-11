/**
 * The subject → design-system mapping.
 *
 * Both functions here exist because EduPage's own data does not fit the design system: it ships
 * an arbitrary hex where the DS wants one of six accents, and it leaves `short` as a copy of the
 * full name where the DS wants a 3-letter code.
 */
import { describe, expect, it } from "vitest";
import type { SubjectRef } from "../../lib/edupage/index.ts";
import {
  SUBJECT_TONES,
  classSubjectTones,
  isBuildingArtifact,
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

describe("classSubjectTones", () => {
  // A1-1's real subject count (CLAUDE.md/DESIGN.md's own worked example: 8 subjects, 6 accents).
  const EIGHT = ["VKI", "LVL", "MAT", "ANG", "INF", "SPO", "KRV", "DIZ"];

  it("never repeats an accent among the first six subjects", () => {
    const tones = classSubjectTones(EIGHT.map((short) => subject({ short })));
    const firstSix = [...tones.values()].slice(0, 6);
    expect(new Set(firstSix).size).toBe(6);
  });

  it("gives the same class the same colours regardless of input order", () => {
    const forward = classSubjectTones(EIGHT.map((short) => subject({ short })));
    const shuffled = classSubjectTones([...EIGHT].reverse().map((short) => subject({ short })));
    expect(Object.fromEntries(shuffled)).toEqual(Object.fromEntries(forward));
  });

  it("does not depend on id, so a weekly republish cannot recolour the class", () => {
    const before = classSubjectTones(EIGHT.map((short, i) => subject({ id: String(i), short })));
    const after = classSubjectTones(
      EIGHT.map((short, i) => subject({ id: String(900 + i), short })),
    );
    expect(Object.fromEntries(after)).toEqual(Object.fromEntries(before));
  });

  it("resolves duplicate subjects (same key) to one entry", () => {
    const tones = classSubjectTones([
      subject({ short: "MAT" }),
      subject({ short: "mat" }),
      subject({ id: "2", short: "ANG" }),
    ]);
    expect(tones.size).toBe(2);
  });

  it("feeds subjectTone so the day list, week grid and subject index agree", () => {
    const tones = classSubjectTones(EIGHT.map((short) => subject({ short })));
    const vki = subject({ short: "VKI" });
    const lvl = subject({ short: "LVL" });
    // The bug this fixes: two subjects sharing an accent by hash coincidence.
    expect(subjectTone(vki, tones)).not.toBe(subjectTone(lvl, tones));
  });
});

describe("isBuildingArtifact", () => {
  it("flags a subject whose derived code is the timetable's own building code", () => {
    const tic = subject({
      short: "Tehnoloģiju un inovāciju centrs Dārzciema ielā",
      name: "Tehnoloģiju un inovāciju centrs Dārzciema ielā",
    });
    expect(isBuildingArtifact(tic, "TIC")).toBe(true);
  });

  it("leaves a real subject alone", () => {
    expect(isBuildingArtifact(subject({ short: "MAT" }), "TIC")).toBe(false);
  });

  it("never throws with no building context", () => {
    expect(isBuildingArtifact(subject({ short: "TIC" }), null)).toBe(false);
  });
});
