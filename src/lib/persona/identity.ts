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
 * Pure and settings-shape only: it knows nothing of `db`, `store` or `ui`.
 */

export const PERSONAS = ["student", "teacher"] as const;
export type Persona = (typeof PERSONAS)[number];
export type TeacherView = "own" | "form-class";

/** The slice of `Settings` a role is resolved from — structural, so `lib/` needn't import `db`. */
export type PersonaSettings = {
  persona: Persona;
  selectedClassId: string | null;
  subgroup: string | null;
  selectedTeacherId: string | null;
  teacherView: TeacherView;
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

/**
 * Only the active role's fields exist on it: a teacher has no subgroup, a student no teacher
 * view. The other role's stored selection stays in `Settings` so switching back is free, but it
 * can't leak into this role's logic.
 */
export type Identity = StudentIdentity | TeacherIdentity;

export const resolveIdentity = (settings: PersonaSettings): Identity =>
  settings.persona === "teacher"
    ? { persona: "teacher", teacherId: settings.selectedTeacherId, view: settings.teacherView }
    : { persona: "student", classId: settings.selectedClassId, subgroup: settings.subgroup };

export type PersonaCases<R> = {
  student: (identity: StudentIdentity) => R;
  teacher: (identity: TeacherIdentity) => R;
};

/** Exhaustive branch on the role — the replacement for every `persona === "teacher" ? … : …`. */
export const matchPersona = <R>(identity: Identity, cases: PersonaCases<R>): R =>
  identity.persona === "teacher" ? cases.teacher(identity) : cases.student(identity);

/** Has the user picked whoever this role is keyed by? Gates onboarding and every screen body. */
export const isIdentified = (identity: Identity): boolean =>
  matchPersona(identity, {
    student: (s) => s.classId !== null,
    teacher: (t) => t.teacherId !== null,
  });

/**
 * A string that changes exactly when the resolved schedule would — for memo keys and effect
 * deps, so a consumer can't forget one of the role's inputs.
 */
export const identityKey = (identity: Identity): string =>
  matchPersona(identity, {
    student: (s) => `student|${s.classId ?? ""}|${s.subgroup ?? ""}`,
    teacher: (t) => `teacher|${t.teacherId ?? ""}|${t.view}`,
  });
