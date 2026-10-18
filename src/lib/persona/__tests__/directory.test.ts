import { describe, expect, it } from "vitest";
import {
  normalizeTimetable,
  parseDaySubstitutions,
  resolveDayAcross,
  resolveTeacherDayAcross,
  teacherKey,
  type Timetable,
} from "@/lib/edupage";
import {
  dayFor,
  planDay,
  planTeacherDay,
  resolveIdentity,
  resolveSubject,
  subjectLabel,
  type DirectorySnapshot,
  type Identity,
  type PersonaSettings,
} from "@/lib/persona";
import {
  FIXTURES,
  FIXTURE_DATE,
  FIXTURE_TT_NUM,
  readFixture,
  readJsonFixture,
} from "@/lib/edupage/__tests__/fixtures.ts";

const raw = readJsonFixture<{
  r: { dbiAccessorRes: { tables: Array<{ id: string; data_rows?: Record<string, unknown>[] }> } };
}>(FIXTURES.regulartt);
const { timetable } = normalizeTimetable(
  Object.fromEntries(raw.r.dbiAccessorRes.tables.map((t) => [t.id, t.data_rows ?? []])),
  {
    ttNum: FIXTURE_TT_NUM,
    building: "Galvenā ēka",
    validFrom: "2026-09-07",
    validTo: "2026-09-11",
    label: "Galvenā ēka 07.09.2026.",
    schoolYear: 2026,
    fetchedAt: "2026-09-09T00:00:00.000Z",
  },
);
const subs = parseDaySubstitutions(
  readFixture(FIXTURES.substHtml),
  FIXTURE_DATE,
  "2026-09-09T00:00:00.000Z",
);

const a12 = timetable.classes.find((c) => c.short === "A1-2")!;
const geislers = timetable.teachers.find((t) => t.short.includes("Geislers"))!;
const formTeacher = timetable.teachers.find((t) => (t.classIds?.length ?? 0) > 0)!;

const identityOf = (patch: Partial<PersonaSettings>): Identity =>
  resolveIdentity({
    persona: "student",
    selectedClassId: null,
    subgroup: null,
    selectedTeacherId: null,
    teacherView: "own",
    ...patch,
  });

const snapshotOf = (
  identity: Identity,
  patch: Partial<DirectorySnapshot> = {},
): DirectorySnapshot => ({
  identity,
  metas: [timetable.meta],
  timetables: { [FIXTURE_TT_NUM]: timetable },
  substitutions: { [FIXTURE_DATE]: subs },
  building: null,
  showMovedOnTargetDay: false,
  ...patch,
});

describe("resolveSubject", () => {
  it("is null while the active role has no pick", () => {
    expect(resolveSubject(identityOf({ selectedTeacherId: geislers.id }), [timetable])).toBeNull();
    expect(resolveSubject(identityOf({ persona: "teacher" }), [timetable])).toBeNull();
  });

  it("names a student's class by its short, with its form teacher", () => {
    const subject = resolveSubject(identityOf({ selectedClassId: a12.id }), [timetable]);
    expect(subject?.persona).toBe("student");
    if (subject?.persona !== "student") return;
    expect(subject.class.label).toBe("A1-2");
    expect(subject.class.ref?.id).toBe(a12.id);
    expect(subject.class.formTeacher?.id).toBe(a12.teacherId ?? undefined);
  });

  it("gives a teacher a label, a feed key equal to teacherKey(label), and their form class", () => {
    const subject = resolveSubject(
      identityOf({
        persona: "teacher",
        selectedTeacherId: formTeacher.id,
        teacherView: "form-class",
      }),
      [timetable],
    );
    if (subject?.persona !== "teacher") throw new Error("expected a teacher subject");
    expect(subject.teacher.label).toBe(formTeacher.short || formTeacher.name);
    // Web Push hashes teacherKey(label); sync and the cover check use feedKey — one value.
    expect(subject.teacher.feedKey).toBe(teacherKey(subject.teacher.label));
    expect(subject.formClass?.id).toBe(formTeacher.classIds?.[0]);
    expect(subject.view).toBe("form-class");
  });

  it("skips a building whose row has no label for the one that does", () => {
    const pointer: Timetable = {
      ...timetable,
      classes: timetable.classes.map((c) => (c.id === a12.id ? { ...c, short: "" } : c)),
    };
    const subject = resolveSubject(identityOf({ selectedClassId: a12.id }), [pointer, timetable]);
    expect(subjectLabel(subject)).toBe("A1-2");
  });

  it("ignores the other role's leftover pick", () => {
    const identity = identityOf({
      persona: "teacher",
      selectedClassId: a12.id,
      selectedTeacherId: geislers.id,
    });
    expect(resolveSubject(identity, [timetable])?.persona).toBe("teacher");
  });
});

describe("subjectLabel", () => {
  it("is null for a pick no cached timetable knows, unless asked to fall back to the id", () => {
    const subject = resolveSubject(identityOf({ selectedClassId: "-unknown" }), [timetable]);
    expect(subjectLabel(subject)).toBeNull();
    expect(subjectLabel(subject, { fallbackToId: true })).toBe("-unknown");

    const teacher = resolveSubject(identityOf({ persona: "teacher", selectedTeacherId: "-gone" }), [
      timetable,
    ]);
    expect(subjectLabel(teacher)).toBeNull();
    if (teacher?.persona === "teacher") expect(teacher.teacher.feedKey).toBeNull();
    expect(subjectLabel(teacher, { fallbackToId: true })).toBe("-gone");
  });

  it("is null with no pick even when falling back", () => {
    expect(subjectLabel(null, { fallbackToId: true })).toBeNull();
  });

  it("names a teacher by themselves in the form-class view too", () => {
    const subject = resolveSubject(
      identityOf({
        persona: "teacher",
        selectedTeacherId: formTeacher.id,
        teacherView: "form-class",
      }),
      [timetable],
    );
    expect(subjectLabel(subject)).toBe(formTeacher.short || formTeacher.name);
  });
});

describe("planDay / dayFor", () => {
  it("resolves a student's class day, filtered by their subgroup", () => {
    const identity = identityOf({ selectedClassId: a12.id, subgroup: "1" });
    expect(dayFor(snapshotOf(identity), FIXTURE_DATE)).toEqual(
      resolveDayAcross([{ timetable, stale: false }], subs, a12.id, FIXTURE_DATE, {
        subgroup: "1",
        relocateMoves: false,
        incomingMoves: [],
      }),
    );
  });

  it("resolves a teacher's own day as a teacher plan", () => {
    const identity = identityOf({ persona: "teacher", selectedTeacherId: geislers.id });
    const plan = planDay(snapshotOf(identity), FIXTURE_DATE);
    expect(plan?.kind).toBe("teacher");
    expect(plan?.resolve()).toEqual(
      resolveTeacherDayAcross([{ timetable, stale: false }], subs, geislers.id, FIXTURE_DATE),
    );
  });

  it("resolves the form class, without a subgroup, in the form-class view", () => {
    const identity = identityOf({
      persona: "teacher",
      selectedTeacherId: formTeacher.id,
      teacherView: "form-class",
      subgroup: "2",
    });
    const plan = planDay(snapshotOf(identity), FIXTURE_DATE);
    expect(plan?.kind).toBe("class");
    expect(plan?.resolve().classId).toBe(formTeacher.classIds?.[0]);
  });

  it("falls back to the teacher's own day when they are no form teacher", () => {
    const identity = identityOf({
      persona: "teacher",
      selectedTeacherId: geislers.id,
      teacherView: "form-class",
    });
    const noForm: Timetable = {
      ...timetable,
      teachers: timetable.teachers.map((t) => (t.id === geislers.id ? { ...t, classIds: [] } : t)),
      classes: timetable.classes.map((c) =>
        c.teacherId === geislers.id ? { ...c, teacherId: null } : c,
      ),
    };
    const plan = planDay(
      snapshotOf(identity, { timetables: { [FIXTURE_TT_NUM]: noForm } }),
      FIXTURE_DATE,
    );
    expect(plan?.kind).toBe("teacher");
  });

  it("is null with no pick or no cached source", () => {
    expect(planDay(snapshotOf(identityOf({})), FIXTURE_DATE)).toBeNull();
    const identity = identityOf({ selectedClassId: a12.id });
    expect(dayFor(snapshotOf(identity, { timetables: {} }), FIXTURE_DATE)).toBeNull();
    expect(
      planTeacherDay(snapshotOf(identity, { metas: [] }), FIXTURE_DATE, geislers.id),
    ).toBeNull();
  });

  it("keys a plan on every input the resolve reads", () => {
    const identity = identityOf({ selectedClassId: a12.id });
    const key = (patch: Partial<DirectorySnapshot>, id: Identity = identity) =>
      planDay(snapshotOf(id, patch), FIXTURE_DATE)?.key;

    const base = key({});
    expect(key({})).toBe(base);
    expect(key({}, identityOf({ selectedClassId: a12.id, subgroup: "1" }))).not.toBe(base);
    expect(key({ showMovedOnTargetDay: true })).not.toBe(base);
    expect(key({ substitutions: {} })).not.toBe(base);
    expect(
      key({
        substitutions: { [FIXTURE_DATE]: { ...subs, fetchedAt: "2026-09-09T09:00:00.000Z" } },
      }),
    ).not.toBe(base);
  });

  it("keys a day by the other days that move a lesson onto it", () => {
    const identity = identityOf({ selectedClassId: a12.id });
    const monday = "2026-09-07";
    const movedOnto = {
      ...subs,
      date: monday,
      items: [{ ...subs.items[0]!, movedToDate: FIXTURE_DATE }],
    };
    const key = (fetchedAt: string) =>
      planDay(
        snapshotOf(identity, {
          showMovedOnTargetDay: true,
          substitutions: { [FIXTURE_DATE]: subs, [monday]: { ...movedOnto, fetchedAt } },
        }),
        FIXTURE_DATE,
      )?.key;
    expect(key("a")).toContain(`${monday}@a`);
    expect(key("a")).not.toBe(key("b"));
  });

  it("keys teacher and class plans apart", () => {
    const teacher = planTeacherDay(snapshotOf(identityOf({})), FIXTURE_DATE, geislers.id);
    expect(teacher?.key.startsWith("teacher|")).toBe(true);
  });
});
