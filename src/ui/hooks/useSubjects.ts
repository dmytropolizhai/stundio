/**
 * The selected class's subject catalogue, derived from the cached timetables.
 *
 * Scoped to the newest published *week* that contains the class, never to all cached weeks —
 * merging weeks would double every lesson count. Within that week every building counts, because
 * a class can be listed in more than one and its lessons live wherever they were published;
 * `classWeekLessons` is what drops the address pointer rows that would otherwise show up here as
 * a subject called "Tehnoloģiju un inovāciju centrs Dārzciema ielā".
 */
import { useMemo } from "react";
import { useAppStore } from "@/store";
import { classWeekLessons, teacherKey } from "@/lib/edupage";
import type { ClassRef, SubjectRef, TeacherRef, Timetable } from "@/lib/edupage";

export type SubjectSummary = {
  subject: SubjectRef;
  /** Lessons per week. A double period counts once — it is one lesson on the timetable. */
  count: number;
  teachers: TeacherRef[];
};

export type TeacherSummary = {
  teacher: TeacherRef;
  /** Subjects this teacher takes with the selected class, in catalogue order. */
  subjects: SubjectRef[];
};

/** Every timetable of the newest published week that contains the class, one per building. */
const weekFor = (timetables: Record<string, Timetable>, classId: string): Timetable[] => {
  const candidates = Object.values(timetables)
    .filter((t) => t.classes.some((c) => c.id === classId))
    .sort((a, b) => a.meta.validFrom.localeCompare(b.meta.validFrom));
  const newest = candidates.at(-1)?.meta.validFrom;
  return newest === undefined ? [] : candidates.filter((t) => t.meta.validFrom === newest);
};

export type SubjectCatalogue = {
  subjects: SubjectSummary[];
  teachers: TeacherSummary[];
  /** The groups a teacher teaches, by class short — what the per-group colour pickers list. */
  groups: ClassRef[];
};

const EMPTY: SubjectCatalogue = { subjects: [], teachers: [], groups: [] };

/**
 * A teacher's own subjects and groups: everything they teach in the newest published week,
 * subjects busiest first, groups by name. Teachers have no class to scope by, so this is what
 * feeds the colour pickers for that role. The teacher is matched on their name key, and groups on
 * their short, since ids only mean something inside one timetable. A group met only through a
 * cover duty is left out: the substitution is a one-off, and a colour for it would outlive it.
 */
const catalogueOfTeacher = (
  timetables: Record<string, Timetable>,
  teacherId: string,
): SubjectCatalogue => {
  const all = Object.values(timetables);
  const me = all.flatMap((t) => t.teachers).find((t) => t.id === teacherId);
  if (me === undefined) return EMPTY;
  const myKey = teacherKey(me.short || me.name);
  const newest = all
    .map((t) => t.meta.validFrom)
    .sort()
    .at(-1);
  const refs = new Map<string, SubjectRef>();
  const counts = new Map<string, number>();
  const groups = new Map<string, ClassRef>();

  for (const timetable of all.filter((t) => t.meta.validFrom === newest)) {
    const mine = new Set(
      timetable.teachers.filter((t) => teacherKey(t.short || t.name) === myKey).map((t) => t.id),
    );
    for (const lesson of timetable.lessons) {
      if (!lesson.teacherIds.some((id) => mine.has(id))) continue;
      for (const classId of lesson.classIds) {
        const group = timetable.classes.find((c) => c.id === classId);
        const key = (group?.short || group?.name) ?? "";
        if (group !== undefined && key !== "" && !groups.has(key)) groups.set(key, group);
      }
      const subject = timetable.subjects.find((s) => s.id === lesson.subjectId);
      if (subject === undefined) continue;
      const key = subject.name === "" ? subject.short : subject.name;
      if (!refs.has(key)) refs.set(key, subject);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const subjects = [...counts.entries()]
    .flatMap(([key, count]) => {
      const subject = refs.get(key);
      return subject === undefined ? [] : [{ subject, count, teachers: [] }];
    })
    .sort((a, b) => b.count - a.count || a.subject.short.localeCompare(b.subject.short, "lv"));

  return {
    subjects,
    teachers: [],
    groups: [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "lv", { numeric: true }))
      .map(([, group]) => group),
  };
};

export const useSubjects = (): SubjectCatalogue => {
  const timetables = useAppStore((s) => s.timetables);
  const classId = useAppStore((s) => s.settings.selectedClassId);
  const subgroup = useAppStore((s) => s.settings.subgroup);
  const persona = useAppStore((s) => s.settings.persona);
  const teacherId = useAppStore((s) => s.settings.selectedTeacherId);

  return useMemo(() => {
    if (persona === "teacher") {
      return teacherId === null ? EMPTY : catalogueOfTeacher(timetables, teacherId);
    }
    if (classId === null) return EMPTY;
    const week = weekFor(timetables, classId);
    if (week.length === 0) return EMPTY;

    /*
     * Keyed on labels, not ids: an id only means something inside the timetable it came from,
     * and this catalogue can span two buildings' weeks. Labels are also what survives a weekly
     * republish, which is the same reason `subjectTone` keys on them.
     */
    const subjectRefs = new Map<string, SubjectRef>();
    const teacherRefs = new Map<string, TeacherRef>();
    const counts = new Map<string, number>();
    /* Sets, because a class can meet the same teacher for the same subject many times a week. */
    const subjectTeachers = new Map<string, Set<string>>();
    const teacherSubjects = new Map<string, Set<string>>();

    for (const { lesson, timetable } of classWeekLessons(week, classId, undefined, subgroup)) {
      const subject = timetable.subjects.find((s) => s.id === lesson.subjectId);
      if (subject === undefined) continue;
      const subjectKey = subject.name === "" ? subject.short : subject.name;
      if (!subjectRefs.has(subjectKey)) subjectRefs.set(subjectKey, subject);
      counts.set(subjectKey, (counts.get(subjectKey) ?? 0) + 1);

      let forSubject = subjectTeachers.get(subjectKey);
      if (forSubject === undefined) {
        forSubject = new Set();
        subjectTeachers.set(subjectKey, forSubject);
      }

      for (const teacherId of lesson.teacherIds) {
        const teacher = timetable.teachers.find((t) => t.id === teacherId);
        if (teacher === undefined) continue;
        const teacherKey = teacher.short === "" ? teacher.name : teacher.short;
        if (!teacherRefs.has(teacherKey)) teacherRefs.set(teacherKey, teacher);

        forSubject.add(teacherKey);
        let forTeacher = teacherSubjects.get(teacherKey);
        if (forTeacher === undefined) {
          forTeacher = new Set();
          teacherSubjects.set(teacherKey, forTeacher);
        }
        forTeacher.add(subjectKey);
      }
    }

    const byKey = <T>(map: Map<string, T>, keys: Iterable<string>): T[] =>
      [...keys].map((key) => map.get(key)).filter((x): x is T => x !== undefined);

    /* Busiest subject first: it is the one the timetable is really about. */
    const subjects: SubjectSummary[] = [...counts.entries()]
      .flatMap(([key, count]) => {
        const subject = subjectRefs.get(key);
        if (subject === undefined) return [];
        return [{ subject, count, teachers: byKey(teacherRefs, subjectTeachers.get(key) ?? []) }];
      })
      .sort((a, b) => b.count - a.count || a.subject.short.localeCompare(b.subject.short, "lv"));

    const teachers: TeacherSummary[] = [...teacherSubjects.entries()]
      .flatMap(([key, subjectKeys]) => {
        const teacher = teacherRefs.get(key);
        if (teacher === undefined) return [];
        return [{ teacher, subjects: byKey(subjectRefs, subjectKeys) }];
      })
      .sort((a, b) => a.teacher.short.localeCompare(b.teacher.short, "lv"));

    return { subjects, teachers, groups: [] };
  }, [timetables, classId, subgroup, persona, teacherId]);
};
