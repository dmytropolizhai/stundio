import { Card, Icon } from "@/ds";
import type { ResolvedLesson } from "@/lib/edupage";
import { StatusBadge } from "@/ui/components/Badge.tsx";
import { formatRange, useT } from "@/ui/i18n";
import { ARROW } from "./subst-status.ts";

type ChangesLessonCardProps = {
  lesson: ResolvedLesson;
  onOpen: (lesson: ResolvedLesson) => void;
};

/** A resolved lesson of the selected class whose status is no longer `normal`. */
export const ChangesLessonCard = ({ lesson, onOpen }: ChangesLessonCardProps) => {
  const t = useT();

  const teacher = lesson.teachers.map((item) => item.short).join(", ");
  const origTeacher = lesson.original?.teachers?.map((item) => item.short).join(", ") ?? "";
  const room = lesson.rooms.map((r) => r.short).join(", ");
  const origRoom = lesson.original?.rooms?.map((r) => r.short).join(", ") ?? "";

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
        <StatusBadge status={lesson.status} />
      </div>

      <div className="font-display text-title font-black text-strong leading-snug">
        {lesson.subject?.name ?? lesson.subject?.short ?? "—"}
      </div>

      <div className="flex flex-col gap-1 font-text text-caption text-muted">
        {teacher !== "" && (
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
        <div className="mt-1 rounded-lg bg-sunken p-2 font-text text-caption text-fg">
          <p className="u-eyebrow text-muted">{t("lesson.fromSchool")}</p>
          <p className="mt-0.5">{lesson.changeNote}</p>
        </div>
      )}
    </Card>
  );
};
