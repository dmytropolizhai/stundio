/**
 * Whose week a share card is about, resolved from the role rather than from raw settings.
 *
 * The card used to read `settings.selectedClassId` directly. That field survives a switch to
 * teacher mode on purpose (switching back is free), so a teacher's card, title and file name
 * carried whatever class they had picked as a student. Here the role decides: a student's card is
 * their class, a teacher's is their own name — or, in the form-class view, the class the grid
 * actually shows. Pure and persona-aware; `useShareWeek` only supplies the data.
 */
import { findClassTeacher, findTeacherFormClassId, type Timetable } from "@/lib/edupage";
import { matchPersona, type Identity } from "@/lib/persona";

export type ShareSubject = {
  /** The card's biggest text, the share-sheet title and the file name's stem. */
  label: string;
  /** Form teacher's name, or `null` when the card has none to credit (a teacher's own week). */
  classTeacher: string | null;
};

const classSubject = (timetables: Timetable[], classId: string): ShareSubject | null => {
  for (const timetable of timetables) {
    const found = timetable.classes.find((c) => c.id === classId);
    if (found !== undefined) {
      return {
        label: found.short,
        classTeacher: findClassTeacher(timetables, classId)?.short ?? null,
      };
    }
  }
  return null;
};

export const resolveShareSubject = (
  identity: Identity,
  timetables: Timetable[],
): ShareSubject | null =>
  matchPersona(identity, {
    student: ({ classId }) => (classId === null ? null : classSubject(timetables, classId)),
    teacher: ({ teacherId, view }) => {
      if (teacherId === null) return null;

      if (view === "form-class") {
        const formClassId = findTeacherFormClassId(timetables, teacherId);
        if (formClassId !== null) return classSubject(timetables, formClassId);
      }

      for (const timetable of timetables) {
        const teacher = timetable.teachers.find((t) => t.id === teacherId);
        const label = teacher?.short || teacher?.name;
        if (label !== undefined && label !== "") return { label, classTeacher: null };
      }
      return null;
    },
  });
