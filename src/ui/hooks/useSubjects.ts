/**
 * The selected class's subject catalogue, derived from the cached timetable.
 *
 * There is one timetable per building, and a class lives in exactly one of them, so this picks
 * the newest cached timetable that actually contains the class rather than merging across all of
 * them — merging would double every lesson count for a class that appears in two published weeks.
 */
import { useMemo } from "react";
import { useAppStore } from "../../store/index.ts";
import type { SubjectRef, TeacherRef, Timetable } from "../../lib/edupage/index.ts";

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

/** Newest published timetable that contains the class, by `validFrom`. */
const timetableFor = (timetables: Record<string, Timetable>, classId: string): Timetable | null => {
  const candidates = Object.values(timetables)
    .filter((t) => t.classes.some((c) => c.id === classId))
    .sort((a, b) => a.meta.validFrom.localeCompare(b.meta.validFrom));
  return candidates.at(-1) ?? null;
};

export type SubjectCatalogue = {
  subjects: SubjectSummary[];
  teachers: TeacherSummary[];
};

const EMPTY: SubjectCatalogue = { subjects: [], teachers: [] };

export const useSubjects = (): SubjectCatalogue => {
  const timetables = useAppStore((s) => s.timetables);
  const classId = useAppStore((s) => s.settings.selectedClassId);

  return useMemo(() => {
    if (classId === null) return EMPTY;
    const timetable = timetableFor(timetables, classId);
    if (timetable === null) return EMPTY;

    const subjectsById = new Map(timetable.subjects.map((s) => [s.id, s]));
    const teachersById = new Map(timetable.teachers.map((t) => [t.id, t]));

    const counts = new Map<string, number>();
    /* Sets, because a class can meet the same teacher for the same subject many times a week. */
    const subjectTeachers = new Map<string, Set<string>>();
    const teacherSubjects = new Map<string, Set<string>>();

    for (const lesson of timetable.lessons) {
      if (!lesson.classIds.includes(classId)) continue;
      counts.set(lesson.subjectId, (counts.get(lesson.subjectId) ?? 0) + 1);

      let forSubject = subjectTeachers.get(lesson.subjectId);
      if (forSubject === undefined) {
        forSubject = new Set();
        subjectTeachers.set(lesson.subjectId, forSubject);
      }
      for (const teacherId of lesson.teacherIds) {
        forSubject.add(teacherId);
        let forTeacher = teacherSubjects.get(teacherId);
        if (forTeacher === undefined) {
          forTeacher = new Set();
          teacherSubjects.set(teacherId, forTeacher);
        }
        forTeacher.add(lesson.subjectId);
      }
    }

    const byId = <T>(map: Map<string, T>, ids: Iterable<string>): T[] =>
      [...ids].map((id) => map.get(id)).filter((x): x is T => x !== undefined);

    /* Busiest subject first: it is the one the timetable is really about. */
    const subjects: SubjectSummary[] = [...counts.entries()]
      .flatMap(([subjectId, count]) => {
        const subject = subjectsById.get(subjectId);
        if (subject === undefined) return [];
        return [
          { subject, count, teachers: byId(teachersById, subjectTeachers.get(subjectId) ?? []) },
        ];
      })
      .sort((a, b) => b.count - a.count || a.subject.short.localeCompare(b.subject.short, "lv"));

    const teachers: TeacherSummary[] = [...teacherSubjects.entries()]
      .flatMap(([teacherId, subjectIds]) => {
        const teacher = teachersById.get(teacherId);
        if (teacher === undefined) return [];
        return [{ teacher, subjects: byId(subjectsById, subjectIds) }];
      })
      .sort((a, b) => a.teacher.short.localeCompare(b.teacher.short, "lv"));

    return { subjects, teachers };
  }, [timetables, classId]);
};
