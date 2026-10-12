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

export type Tab = "home" | "week" | "changes" | "subjects" | "settings";

/**
 * The bottom nav floats as two separate pills: the timetable itself (today, the week, what
 * changed) and everything about *you* (your subjects, your settings). Splitting them keeps the
 * three views of the schedule — the ones opened many times a day — in one thumb-sized cluster,
 * and stops the rarely-visited personal screens from diluting it.
 */
export type NavGroups = {
  schedule: readonly Tab[];
  personal: readonly Tab[];
};

export type PersonaProfile = {
  /** Bottom-nav tabs, per pill, in order. Teachers have no personal subject notes. */
  nav: NavGroups;
  /** Which picker makes this role's selection. */
  picker: "class" | "teacher" | "university";
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
  /**
   * The source publishes changes as a separate feed (RVT's substitutions), so there are moved
   * lessons to place and a Changes tab to read. A university's events already are the changes.
   */
  hasChangeFeed: boolean;
  /** The one-time "teachers can use Stundio too" sheet — pointless once you are one. */
  seesTeacherAnnouncement: boolean;
  /** The Customization sheet's per-role bits: its preview card and the subject-colour copy. */
  customization: {
    /**
     * What the preview card leads with — mirrors `lessonHeading`, so the preview looks like the
     * role's own day list: a student scans for the subject, a teacher for the group and room.
     */
    previewLeadsWith: "subject" | "group";
    /** Above the per-subject pickers: whose subjects these are. */
    subjectColorsHint: MessageKey;
    /** When there is nothing to colour yet because the role's selection is missing. */
    subjectColorsEmpty: MessageKey;
  };
};

export const PERSONA_PROFILES: Record<Persona, PersonaProfile> = {
  student: {
    nav: { schedule: ["home", "week", "changes"], personal: ["subjects", "settings"] },
    picker: "class",
    icon: "graduation-cap",
    roleLabel: "settings.persona.student",
    subjectLabel: "settings.class",
    noneSelected: "day.noClass",
    myChangesFilter: "changes.filter.myClass",
    changeIdentityLabel: "day.changeClass",
    hasSubgroups: true,
    hasChangeFeed: true,
    seesTeacherAnnouncement: true,
    customization: {
      previewLeadsWith: "subject",
      subjectColorsHint: "customization.subjectColors.hint",
      subjectColorsEmpty: "customization.subjectColors.empty",
    },
  },
  teacher: {
    nav: { schedule: ["home", "week", "changes"], personal: ["settings"] },
    picker: "teacher",
    icon: "briefcase",
    roleLabel: "settings.persona.teacher",
    subjectLabel: "onboarding.teacher.title",
    noneSelected: "teacher.none",
    myChangesFilter: "changes.filter.myChanges",
    changeIdentityLabel: "onboarding.teacher.title",
    hasSubgroups: false,
    hasChangeFeed: true,
    seesTeacherAnnouncement: false,
    customization: {
      previewLeadsWith: "group",
      subjectColorsHint: "customization.subjectColors.hint.teacher",
      subjectColorsEmpty: "customization.subjectColors.empty.teacher",
    },
  },
  /*
   * RTU / LU students (MODEL-UNIVERSITY.md). No Changes tab: a university publishes no
   * substitution feed — a moved lecture is simply the new event, already in the day. Subgroups
   * are LU's own child groups ("fiziviens"), never RVT's numbered divisions.
   */
  university: {
    nav: { schedule: ["home", "week"], personal: ["subjects", "settings"] },
    picker: "university",
    icon: "landmark",
    roleLabel: "settings.persona.university",
    subjectLabel: "settings.group",
    noneSelected: "university.none",
    myChangesFilter: "changes.filter.myClass",
    changeIdentityLabel: "university.change",
    hasSubgroups: true,
    hasChangeFeed: false,
    seesTeacherAnnouncement: false,
    customization: {
      previewLeadsWith: "subject",
      subjectColorsHint: "customization.subjectColors.hint",
      subjectColorsEmpty: "customization.subjectColors.empty",
    },
  },
};
