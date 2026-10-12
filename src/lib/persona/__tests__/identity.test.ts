import { describe, expect, it } from "vitest";
import {
  fallbackPersona,
  identityKey,
  isIdentified,
  matchPersona,
  resolveIdentity,
  type PersonaSettings,
} from "@/lib/persona";

const base: PersonaSettings = {
  persona: "student",
  selectedClassId: "-10",
  subgroup: "1",
  selectedTeacherId: "-403",
  teacherView: "form-class",
  university: "lu",
  universityGroup: {
    university: "lu",
    id: "26R-21023-PLK-1",
    label: "26R-21023",
    program: "Fizika",
  },
  universitySubgroup: "fiziviens",
};

describe("resolveIdentity", () => {
  it("keeps only the student's own selection", () => {
    expect(resolveIdentity(base)).toEqual({ persona: "student", classId: "-10", subgroup: "1" });
  });

  it("keeps only the teacher's own selection — no class or subgroup leaks across", () => {
    expect(resolveIdentity({ ...base, persona: "teacher" })).toEqual({
      persona: "teacher",
      teacherId: "-403",
      view: "form-class",
    });
  });

  it("keeps only the university student's group — and drops one from the other university", () => {
    expect(resolveIdentity({ ...base, persona: "university" })).toEqual({
      persona: "university",
      university: "lu",
      group: base.universityGroup,
      subgroup: "fiziviens",
    });
    expect(resolveIdentity({ ...base, persona: "university", university: "rtu" })).toMatchObject({
      university: "rtu",
      group: null,
    });
  });
});

describe("matchPersona", () => {
  it("dispatches to the active role's branch with its narrowed identity", () => {
    const cases = {
      student: (s: { classId: string | null }) => `class ${s.classId ?? "-"}`,
      teacher: (t: { teacherId: string | null }) => `teacher ${t.teacherId ?? "-"}`,
      university: (u: { group: { id: string } | null }) => `group ${u.group?.id ?? "-"}`,
    };
    expect(matchPersona(resolveIdentity(base), cases)).toBe("class -10");
    expect(matchPersona(resolveIdentity({ ...base, persona: "teacher" }), cases)).toBe(
      "teacher -403",
    );
    expect(matchPersona(resolveIdentity({ ...base, persona: "university" }), cases)).toBe(
      "group 26R-21023-PLK-1",
    );
  });
});

describe("isIdentified", () => {
  it("is keyed by the active role's selection only", () => {
    expect(isIdentified(resolveIdentity(base))).toBe(true);
    expect(isIdentified(resolveIdentity({ ...base, selectedClassId: null }))).toBe(false);
    // A leftover class id does not identify a teacher.
    expect(
      isIdentified(resolveIdentity({ ...base, persona: "teacher", selectedTeacherId: null })),
    ).toBe(false);
    expect(isIdentified(resolveIdentity({ ...base, persona: "teacher" }))).toBe(true);
    expect(isIdentified(resolveIdentity({ ...base, persona: "university" }))).toBe(true);
    expect(
      isIdentified(resolveIdentity({ ...base, persona: "university", universityGroup: null })),
    ).toBe(false);
  });
});

describe("identityKey", () => {
  it("changes with every input of the active role", () => {
    const key = (patch: Partial<PersonaSettings>) =>
      identityKey(resolveIdentity({ ...base, ...patch }));
    expect(key({})).not.toBe(key({ subgroup: null }));
    expect(key({})).not.toBe(key({ selectedClassId: "-11" }));
    expect(key({ persona: "teacher" })).not.toBe(key({ persona: "teacher", teacherView: "own" }));
    expect(key({ persona: "teacher" })).not.toBe(key({}));
    expect(key({ persona: "university" })).not.toBe(
      key({ persona: "university", universitySubgroup: null }),
    );
    expect(key({ persona: "university" })).not.toBe(key({}));
  });

  it("ignores the inactive role's leftovers", () => {
    const key = (patch: Partial<PersonaSettings>) =>
      identityKey(resolveIdentity({ ...base, ...patch }));
    expect(key({})).toBe(key({ selectedTeacherId: null, teacherView: "own" }));
    expect(key({ persona: "teacher" })).toBe(
      key({ persona: "teacher", selectedClassId: null, subgroup: null }),
    );
  });
});

describe("fallbackPersona", () => {
  it("names another role the user already set up", () => {
    // A student who switched to teacher mode before picking a teacher.
    expect(fallbackPersona({ ...base, persona: "teacher", selectedTeacherId: null })).toBe(
      "student",
    );
    expect(fallbackPersona({ ...base, persona: "university", universityGroup: null })).toBe(
      "student",
    );
  });

  it("is null on a first run, with nothing picked anywhere", () => {
    expect(
      fallbackPersona({
        ...base,
        selectedClassId: null,
        selectedTeacherId: null,
        universityGroup: null,
      }),
    ).toBeNull();
  });
});
