import type { ResolvedDay, ResolvedLesson, TeacherResolvedLesson } from "@/lib/edupage";
import { Button, Card } from "@/ds";
import { Sheet } from "@/ui/components/Sheet.tsx";
import { StatusBadge } from "@/ui/components/Badge.tsx";
import { formatRange, useT } from "@/ui/i18n";
import { LessonField } from "./lesson-field.tsx";

type LessonSheetProps = {
  lesson: ResolvedLesson | null;
  day: ResolvedDay | null;
  onClose: () => void;
};

/**
 * Lesson detail sheet. Its job is the diff: what the base timetable said versus what the school
 * changed. `changeNote` is EduPage's own Latvian sentence — shown verbatim under a
 * "from school" label, never translated (CLAUDE.md).
 */
export const LessonSheet = ({ lesson, day, onClose }: LessonSheetProps) => {
  const t = useT();
  const open = lesson !== null;
  const title = lesson?.subject?.name ?? lesson?.subject?.short ?? "";
  const origSubject = lesson?.original?.subject?.name ?? lesson?.original?.subject?.short ?? "";
  const origTeachers = (lesson?.original?.teachers ?? []).map((x) => x.short).join(", ");
  const origRooms = (lesson?.original?.rooms ?? []).map((x) => x.short).join(", ");

  const teacherLesson = lesson as Partial<TeacherResolvedLesson> | null;
  const isTeacherMode = teacherLesson?.classes !== undefined && teacherLesson.classes.length > 0;
  const classNames = isTeacherMode
    ? teacherLesson.classes?.map((c) => c.short || c.name).join(", ")
    : null;
  const isCover = lesson?.isCover === true || teacherLesson?.role === "cover";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title === "" ? "—" : title}
      subtitle={
        origSubject !== "" && origSubject !== title ? (
          <span data-testid="lesson-original-subject" className="line-through opacity-75">
            {origSubject}
          </span>
        ) : undefined
      }
      eyebrow={lesson === null ? undefined : formatRange(lesson.start, lesson.end)}
    >
      {lesson !== null && (
        <div className="pb-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={lesson.status} />
          </div>

          <dl className="flex flex-col">
            <LessonField
              label={t("lesson.period")}
              value={lesson.period}
              was={lesson.original?.period}
            />
            {isTeacherMode && classNames && (
              <LessonField label={t("settings.class")} value={classNames} />
            )}
            {!isTeacherMode && (
              <LessonField
                label={t("lesson.teacher")}
                value={lesson.teachers.map((x) => x.short).join(", ")}
                was={origTeachers}
              />
            )}
            <LessonField
              label={t("lesson.room")}
              value={lesson.rooms.map((x) => x.short).join(", ")}
              was={origRooms}
            />
            {isCover && (
              <LessonField
                label={t("teacher.cover")}
                value={
                  teacherLesson?.coverFor?.name ??
                  teacherLesson?.coverFor?.short ??
                  t("teacher.cover")
                }
              />
            )}
            {!isTeacherMode && <LessonField label={t("lesson.group")} value={lesson.group ?? ""} />}
            <LessonField
              label={t("lesson.building")}
              value={lesson.building ?? day?.building ?? ""}
            />
          </dl>

          {(() => {
            const schoolNotes: string[] = [];
            if (lesson.changeNote !== null) {
              schoolNotes.push(lesson.changeNote);
            }
            if (lesson.noteRefs !== undefined) {
              for (const ref of lesson.noteRefs) {
                if (!schoolNotes.includes(ref)) {
                  schoolNotes.push(ref);
                }
              }
            }
            if (schoolNotes.length === 0) return null;
            return (
              <Card tone="sunken" radius="lg" elevation="none" className="mt-4">
                <p className="u-eyebrow">{t("lesson.fromSchool")}</p>
                {schoolNotes.map((note) => (
                  <p key={note} className="mt-1 font-text text-body text-fg">
                    {note}
                  </p>
                ))}
              </Card>
            );
          })()}

          <Button variant="inverse" block onClick={onClose} className="mt-5">
            {t("lesson.close")}
          </Button>
        </div>
      )}
    </Sheet>
  );
};
