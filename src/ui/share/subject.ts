/**
 * Whose week a share card is about, resolved from the role rather than from raw settings.
 *
 * The card used to read `settings.selectedClassId` directly. That field survives a switch to
 * teacher mode on purpose (switching back is free), so a teacher's card, title and file name
 * carried whatever class they had picked as a student. Here the role decides: a student's card is
 * their class, a teacher's is their own name — or, in the form-class view, the class the grid
 * actually shows. Pure and persona-aware; `useShareWeek` only supplies the data, and the lookups
 * themselves are `lib/persona`'s `resolveSubject` — this only picks which entry names the card.
 */
import { resolveSubject, type ClassEntry, type Identity } from "@/lib/persona";
import type { Timetable } from "@/lib/edupage";

export type ShareSubject = {
  /** The card's biggest text, the share-sheet title and the file name's stem. */
  label: string;
  /** Form teacher's name, or `null` when the card has none to credit (a teacher's own week). */
  classTeacher: string | null;
};

const classSubject = ({ label, formTeacher }: ClassEntry): ShareSubject | null =>
  label === null ? null : { label, classTeacher: formTeacher?.short ?? null };

export const resolveShareSubject = (
  identity: Identity,
  timetables: Timetable[],
): ShareSubject | null => {
  const subject = resolveSubject(identity, timetables);
  if (subject === null) return null;
  if (subject.persona === "student") return classSubject(subject.class);
  if (subject.view === "form-class" && subject.formClass !== null) {
    return classSubject(subject.formClass);
  }
  const { label } = subject.teacher;
  return label === null ? null : { label, classTeacher: null };
};
