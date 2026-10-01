import { Badge, LessonCard } from "@/ds";
import type { ResolvedLesson, TeacherResolvedLesson } from "@/lib/edupage";
import { useAppStore } from "@/store";
import { StatusBadge } from "@/ui/components/Badge.tsx";
import { lessonHeading } from "@/ui/components/lesson-heading.ts";
import { useT } from "@/ui/i18n";
import { STATUS_TREATMENT, subjectAccent } from "@/ui/theme";
import { ARROW } from "./subst-status.ts";

type ChangesLessonCardProps = {
  lesson: ResolvedLesson;
  onOpen: (lesson: ResolvedLesson) => void;
};

/** `was → now`, or just `now` when nothing was swapped. */
const diff = (was: string, now: string) =>
  was !== "" && was !== now ? (
    <>
      <span className="line-through opacity-70">{was}</span>
      {now !== "" && (
        <>
          {" "}
          {ARROW} <strong className="text-strong">{now}</strong>
        </>
      )}
    </>
  ) : (
    now
  );

/**
 * A resolved lesson of the selected class/teacher whose status is no longer `normal` or is a cover
 * duty. It is the day list's `LessonCard` with the same lead (subject for a student, group for a
 * teacher) and the same subject-coloured period disc, so a lesson looks the same here as it does
 * on the schedule; only the status word and the was → now diffs are added.
 */
export const ChangesLessonCard = ({ lesson, onOpen }: ChangesLessonCardProps) => {
  const t = useT();
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);

  const teacherLesson = lesson as Partial<TeacherResolvedLesson>;
  const teacher = lesson.teachers.map((item) => item.short).join(", ");
  const origTeacher = lesson.original?.teachers?.map((item) => item.short).join(", ") ?? "";
  const origRoom = lesson.original?.rooms?.map((r) => r.short).join(", ") ?? "";

  // A room swap needs its own was → now line, so the title stops carrying the room then.
  const roomChanged = origRoom !== "" && origRoom !== lesson.rooms.map((r) => r.short).join(", ");
  const heading = lessonHeading(lesson, !roomChanged);
  const isTeacherMode = heading.isTeacherMode;

  const isCover = lesson.isCover === true || teacherLesson.role === "cover";
  const coverFor = teacherLesson.coverFor?.name ?? teacherLesson.coverFor?.short;
  const accent = subjectAccent(lesson.subject, subjectColorOverrides, colorCodingEnabled);

  const showTeacher = !isTeacherMode && (teacher !== "" || origTeacher !== "");
  const showRoom = !isTeacherMode || roomChanged;

  return (
    <div className="flex flex-col gap-2">
      <LessonCard
        period={lesson.period}
        start={lesson.start}
        end={lesson.end}
        subject={heading.title}
        subtitle={heading.subtitle}
        {...(showTeacher ? { teacher: diff(origTeacher, teacher) } : {})}
        {...(showRoom && heading.rooms !== "" ? { room: diff(origRoom, heading.rooms) } : {})}
        tone={accent.tone}
        {...(accent.tone === "custom"
          ? { accentColor: { fill: accent.fill, ink: accent.ink } }
          : {})}
        status={STATUS_TREATMENT[lesson.status]}
        badge={
          isCover ? (
            <Badge tone="warning" uppercase={false} data-testid="status-cover">
              {coverFor ? t("teacher.coverFor", { name: coverFor }) : t("teacher.cover")}
            </Badge>
          ) : (
            <StatusBadge status={lesson.status} />
          )
        }
        onClick={() => {
          onOpen(lesson);
        }}
        data-testid={`change-lesson-${String(lesson.period)}`}
      />

      {lesson.changeNote !== null && (
        <div className="rounded-lg bg-sunken p-4 font-text text-caption text-fg">
          <p className="u-eyebrow text-muted">{t("lesson.fromSchool")}</p>
          <p className="mt-0.5">{lesson.changeNote}</p>
        </div>
      )}
    </div>
  );
};
