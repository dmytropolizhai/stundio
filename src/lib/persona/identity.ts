/**
 * Role resolution: the one place that turns the flat persona settings into *who the user is*.
 *
 * Student and teacher are separated at the root — a student is identified by a class (plus an
 * optional subgroup), a teacher by a teacher id (plus which timetable they are viewing). Before
 * this module every layer re-derived that from `settings.persona` with its own ternary, and the
 * copies drifted (one forgot the subgroup, another the teacher view). Now everything goes
 * through `resolveIdentity` and branches with `matchPersona`, which the compiler forces to be
 * exhaustive, so a third role — or a new per-role field — is a type error everywhere it matters
 * rather than a silent `else`.
 *
 * A university student (RTU / LU) is the third role: identified by a study group the
 * university's own catalogue names, read from a different source entirely (`lib/university`).
 *
 * Pure and settings-shape only: it knows nothing of `db`, `store` or `ui`.
 */
import type { UniversityGroupRef, UniversityId } from "@/lib/university";

export const PERSONAS = ["student", "teacher", "university"] as const;
export type Persona = (typeof PERSONAS)[number];
export type TeacherView = "own" | "form-class";

/** The slice of `Settings` a role is resolved from — structural, so `lib/` needn't import `db`. */
export type PersonaSettings = {
  persona: Persona;
  selectedClassId: string | null;
  subgroup: string | null;
  selectedTeacherId: string | null;
  teacherView: TeacherView;
  university: UniversityId;
  universityGroup: UniversityGroupRef | null;
  universitySubgroup: string | null;
};

export type StudentIdentity = {
  persona: "student";
  classId: string | null;
  /** `null` shows every division merged. */
  subgroup: string | null;
};

export type TeacherIdentity = {
  persona: "teacher";
  teacherId: string | null;
  view: TeacherView;
};

export type UniversityIdentity = {
  persona: "university";
  university: UniversityId;
  /** Always a group of `university` — a group left over from the other one reads as none. */
  group: UniversityGroupRef | null;
  /** An LU child group; `null` shows every subgroup's events. */
  subgroup: string | null;
};

/**
 * Only the active role's fields exist on it: a teacher has no subgroup, a student no teacher
 * view. The other role's stored selection stays in `Settings` so switching back is free, but it
 * can't leak into this role's logic.
 */
export type Identity = StudentIdentity | TeacherIdentity | UniversityIdentity;

export const resolveIdentity = (settings: PersonaSettings): Identity => {
  switch (settings.persona) {
    case "teacher":
      return {
        persona: "teacher",
        teacherId: settings.selectedTeacherId,
        view: settings.teacherView,
      };
    case "university": {
      const group = settings.universityGroup;
      return {
        persona: "university",
        university: settings.university,
        group: group !== null && group.university === settings.university ? group : null,
        subgroup: settings.universitySubgroup,
      };
    }
    case "student":
      return { persona: "student", classId: settings.selectedClassId, subgroup: settings.subgroup };
  }
};

export type PersonaCases<R> = {
  student: (identity: StudentIdentity) => R;
  teacher: (identity: TeacherIdentity) => R;
  university: (identity: UniversityIdentity) => R;
};

/** Exhaustive branch on the role — the replacement for every `persona === "teacher" ? … : …`. */
export const matchPersona = <R>(identity: Identity, cases: PersonaCases<R>): R => {
  switch (identity.persona) {
    case "teacher":
      return cases.teacher(identity);
    case "university":
      return cases.university(identity);
    case "student":
      return cases.student(identity);
  }
};

/** Has the user picked whoever this role is keyed by? Gates onboarding and every screen body. */
export const isIdentified = (identity: Identity): boolean =>
  matchPersona(identity, {
    student: (s) => s.classId !== null,
    teacher: (t) => t.teacherId !== null,
    university: (u) => u.group !== null,
  });

/**
 * A string that changes exactly when the resolved schedule would — for memo keys and effect
 * deps, so a consumer can't forget one of the role's inputs.
 */
export const identityKey = (identity: Identity): string =>
  matchPersona(identity, {
    student: (s) => `student|${s.classId ?? ""}|${s.subgroup ?? ""}`,
    teacher: (t) => `teacher|${t.teacherId ?? ""}|${t.view}`,
    university: (u) => `university|${u.university}|${u.group?.id ?? ""}|${u.subgroup ?? ""}`,
  });

/**
 * A role this user has already set up, other than the active one — `null` on a first run.
 * Switching to a role with nothing picked yet leaves the app unidentified; this is what tells
 * a returning user (who should land in that role's picker, and can back out to this role)
 * apart from a new one (who gets the full onboarding).
 */
export const fallbackPersona = (settings: PersonaSettings): Persona | null =>
  PERSONAS.find(
    (persona) =>
      persona !== settings.persona && isIdentified(resolveIdentity({ ...settings, persona })),
  ) ?? null;
