import { Badge, Card, Icon } from "@/ds";
import type { ResolvedLesson, TeacherResolvedLesson } from "@/lib/edupage";
import { StatusBadge } from "@/ui/components/Badge.tsx";
import { formatRange, useT } from "@/ui/i18n";
import { ARROW } from "./subst-status.ts";

type ChangesLessonCardProps = {
  lesson: ResolvedLesson;
  onOpen: (lesson: ResolvedLesson) => void;
};

/** A resolved lesson of the selected class/teacher whose status is no longer `normal` or is a cover duty. */
export const ChangesLessonCard = ({ lesson, onOpen }: ChangesLessonCardProps) => {
  const t = useT();

  const teacherLesson = lesson as Partial<TeacherResolvedLesson>;
  const isTeacherMode =
    (teacherLesson.classes !== undefined && teacherLesson.classes.length > 0) ||
    teacherLesson.role !== undefined ||
    lesson.isCover === true;

  const classNames = teacherLesson.classes?.map((c) => c.short || c.name).join(" + ");
  const teacher = lesson.teachers.map((item) => item.short).join(", ");
  const origTeacher = lesson.original?.teachers?.map((item) => item.short).join(", ") ?? "";
  const room = lesson.rooms.map((r) => r.short).join(", ");
  const origRoom = lesson.original?.rooms?.map((r) => r.short).join(", ") ?? "";
  const isCover = lesson.isCover === true || teacherLesson.role === "cover";

  return (
    <Card
      className="flex flex-col gap-2.5 cursor-pointer text-left"
      data-testid={`change-lesson-${lesson.period}`}
      onClick={() => {
        onOpen(lesson);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-data text-caption font-bold text-strong">#{lesson.period}</span>
          <span className="font-text text-caption text-muted">
            {formatRange(lesson.start, lesson.end)}
          </span>
        </div>
        {isCover ? (
          <Badge tone="warning" uppercase={false} data-testid="status-cover">
            {teacherLesson.coverFor?.name
              ? t("teacher.coverFor", { name: teacherLesson.coverFor.name })
              : teacherLesson.coverFor?.short
                ? t("teacher.coverFor", { name: teacherLesson.coverFor.short })
                : t("teacher.cover")}
          </Badge>
        ) : (
          <StatusBadge status={lesson.status} />
        )}
      </div>

      <div className="font-display text-title font-black text-strong leading-snug">
        {lesson.subject?.name ?? lesson.subject?.short ?? "—"}
      </div>

      <div className="flex flex-col gap-1 font-text text-caption text-muted">
        {isTeacherMode && classNames && (
          <div className="flex items-center gap-1.5">
            <Icon name="graduation-cap" size={14} className="shrink-0" />
            <strong className="text-fg">{classNames}</strong>
          </div>
        )}

        {!isTeacherMode && teacher !== "" && (
          <div className="flex items-center gap-1.5">
            <Icon name="user-round" size={14} className="shrink-0" />
            <span>
              {origTeacher !== "" && origTeacher !== teacher ? (
                <>
                  <span className="line-through opacity-70">{origTeacher}</span>
                  <span className="mx-1">{ARROW}</span>
                  <strong className="text-fg">{teacher}</strong>
                </>
              ) : (
                <span className="text-fg">{teacher}</span>
              )}
            </span>
          </div>
        )}

        {room !== "" && (
          <div className="flex items-center gap-1.5">
            <Icon name="map-pin" size={14} className="shrink-0" />
            <span>
              {origRoom !== "" && origRoom !== room ? (
                <>
                  <span className="line-through opacity-70">{origRoom}</span>
                  <span className="mx-1">{ARROW}</span>
                  <strong className="text-fg">{room}</strong>
                </>
              ) : (
                <span className="text-fg">{room}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {lesson.changeNote !== null && (
        <div className="mt-1 rounded-lg bg-sunken p-4 font-text text-caption text-fg">
          <p className="u-eyebrow text-muted">{t("lesson.fromSchool")}</p>
          <p className="mt-0.5">{lesson.changeNote}</p>
        </div>
      )}
    </Card>
  );
};
