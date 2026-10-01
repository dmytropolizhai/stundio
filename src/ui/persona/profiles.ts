/**
 * Per-role UI profiles — the strategy table the screens read instead of branching on
 * `settings.persona` themselves. Everything that differs between a student's and a teacher's
 * chrome (which tabs exist, the identity icon, the "nobody picked" copy, which features apply)
 * lives in one row per role, so adding a difference is one edit here, and `Record<Persona, …>`
 * makes a missing role a type error.
 *
 * Behaviour that needs the role's *data* (the selected class vs. teacher) goes through
 * `matchPersona` instead; this table is for the static, per-role constants.
 */
import type { IconName } from "@/ds";
import type { Persona } from "@/lib/persona";
import type { MessageKey } from "@/ui/i18n";

export type Tab = "day" | "week" | "changes" | "subjects" | "settings";

export type PersonaProfile = {
  /** Bottom-nav tabs, in order. Teachers have no personal subject notes. */
  tabs: readonly Tab[];
  /** Which picker makes this role's selection. */
  picker: "class" | "teacher";
  /** The role's identity glyph — badge chip, empty states. */
  icon: IconName;
  /** "Student" / "Teacher" — the role's own name. */
  roleLabel: MessageKey;
  /** What the role is keyed by: "Class" / "Teacher". */
  subjectLabel: MessageKey;
  /** Empty state when the role's selection is missing. */
  noneSelected: MessageKey;
  /** The Changes screen's first filter tab. */
  myChangesFilter: MessageKey;
  /** Accessible name of the identity chip in the top bars. */
  changeIdentityLabel: MessageKey;
  /** Subgroups split a class; a teacher's timetable has none to pick. */
  hasSubgroups: boolean;
  /** The one-time "teachers can use Stundio too" sheet — pointless once you are one. */
  seesTeacherAnnouncement: boolean;
};

export const PERSONA_PROFILES: Record<Persona, PersonaProfile> = {
  student: {
    tabs: ["day", "week", "changes", "subjects", "settings"],
    picker: "class",
    icon: "graduation-cap",
    roleLabel: "settings.persona.student",
    subjectLabel: "settings.class",
    noneSelected: "day.noClass",
    myChangesFilter: "changes.filter.myClass",
    changeIdentityLabel: "day.changeClass",
    hasSubgroups: true,
    seesTeacherAnnouncement: true,
  },
  teacher: {
    tabs: ["day", "week", "changes", "settings"],
    picker: "teacher",
    icon: "briefcase",
    roleLabel: "settings.persona.teacher",
    subjectLabel: "onboarding.teacher.title",
    noneSelected: "teacher.none",
    myChangesFilter: "changes.filter.myChanges",
    changeIdentityLabel: "onboarding.teacher.title",
    hasSubgroups: false,
    seesTeacherAnnouncement: false,
  },
};
