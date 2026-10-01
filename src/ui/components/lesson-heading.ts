import type { ResolvedLesson, TeacherResolvedLesson } from "@/lib/edupage";

/**
 * What a lesson card leads with, shared by the day list and the changes list so the same lesson
 * reads the same in both. A student leads with the subject; a teacher leads with the group (and
 * room), because "which class, where" is what they scan for and the subject is the detail.
 */
export type LessonHeading = {
  isTeacherMode: boolean;
  classNames: string | undefined;
  rooms: string;
  subjectName: string;
  title: string;
  subtitle: string | undefined;
};

export const lessonHeading = (lesson: ResolvedLesson, withRoom = true): LessonHeading => {
  const teacherLesson = lesson as Partial<TeacherResolvedLesson>;
  const isTeacherMode =
    (teacherLesson.classes !== undefined && teacherLesson.classes.length > 0) ||
    teacherLesson.role !== undefined ||
    lesson.isCover === true;

  const classNames = teacherLesson.classes?.map((c) => c.short || c.name).join(" + ");
  const rooms = lesson.rooms.map((x) => x.short).join(", ");
  const subjectName = lesson.subject?.name ?? lesson.subject?.short ?? "—";
  const room = withRoom ? rooms : "";

  const title = isTeacherMode
    ? classNames && room
      ? `${classNames} · ${room}`
      : classNames || room || subjectName
    : subjectName;

  return {
    isTeacherMode,
    classNames,
    rooms,
    subjectName,
    title,
    subtitle: isTeacherMode ? subjectName : undefined,
  };
};
