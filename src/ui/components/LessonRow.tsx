import { memo } from "react";
import type { ResolvedLesson, TeacherResolvedLesson } from "@/lib/edupage";
import { Badge, LessonCard } from "@/ds";
import { STATUS_TREATMENT, isChanged, subjectAccent } from "@/ui/theme";
import { StatusDot } from "./Badge.tsx";
import { useT } from "@/ui/i18n";
import { useAppStore } from "@/store";

type LessonRowProps = {
  lesson: ResolvedLesson;
  live: boolean;
  progress?: number;
  showTime: boolean;
  building?: string;
  subjectColorOverrides: Record<string, string>;
  colorCodingEnabled: boolean;
  filled: boolean;
  onOpen?: () => void;
};

export const LessonRow = memo(
  ({
    lesson,
    live,
    progress,
    showTime,
    building,
    subjectColorOverrides,
    colorCodingEnabled,
    filled,
    onOpen,
  }: LessonRowProps) => {
    const t = useT();
    const highlightCoverLessons = useAppStore((s) => s.settings.highlightCoverLessons);

    const teacherLesson = lesson as Partial<TeacherResolvedLesson>;
    const isTeacherMode =
      (teacherLesson.classes !== undefined && teacherLesson.classes.length > 0) ||
      teacherLesson.role !== undefined ||
      lesson.isCover === true;

    const classNames = teacherLesson.classes?.map((c) => c.short || c.name).join(" + ");
    const rooms = lesson.rooms.map((x) => x.short).join(", ");
    const teachers = lesson.teachers.map((x) => x.short).join(", ");
    const subjectName = lesson.subject?.name ?? lesson.subject?.short ?? "—";

    const subject = isTeacherMode
      ? classNames && rooms
        ? `${classNames} · ${rooms}`
        : classNames || rooms || subjectName
      : subjectName;

    const subtitle = isTeacherMode ? subjectName : undefined;

    const isCover = lesson.isCover === true || teacherLesson.role === "cover";
    const coverBadgeText = teacherLesson.coverFor?.name
      ? t("teacher.coverFor", { name: teacherLesson.coverFor.name })
      : teacherLesson.coverFor?.short
        ? t("teacher.coverFor", { name: teacherLesson.coverFor.short })
        : t("teacher.cover");

    const status = live ? "now" : STATUS_TREATMENT[lesson.status];
    const accent = subjectAccent(lesson.subject, subjectColorOverrides, colorCodingEnabled);

    return (
      <li className="relative">
        <LessonCard
          period={lesson.period}
          start={lesson.start}
          end={lesson.end}
          subject={subject}
          subtitle={subtitle}
          {...(!isTeacherMode && teachers !== "" ? { teacher: teachers } : {})}
          {...(!isTeacherMode && rooms !== "" ? { room: rooms } : {})}
          {...(building === undefined ? {} : { building })}
          tone={accent.tone}
          {...(accent.tone === "custom"
            ? { accentColor: { fill: accent.fill, ink: accent.ink } }
            : {})}
          filled={filled}
          status={status}
          timeVisible={showTime}
          badge={
            live || isCover ? (
              <div className="flex items-center gap-1.5">
                {live && (
                  <Badge tone="brand" data-testid="status-now">
                    {t("day.now")}
                  </Badge>
                )}
                {isCover && (
                  <Badge tone="warning" uppercase={false} data-testid="status-cover">
                    {coverBadgeText}
                  </Badge>
                )}
              </div>
            ) : undefined
          }
          indicator={
            !live && isChanged(lesson.status) ? <StatusDot status={lesson.status} /> : undefined
          }
          className={isCover && highlightCoverLessons ? "ring-2 ring-warning" : undefined}
          {...(onOpen === undefined ? {} : { onClick: onOpen })}
          data-testid={`lesson-${lesson.period}`}
        />

        {live && progress !== undefined && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 bottom-2 h-1 overflow-hidden rounded-pill bg-sunken"
          >
            <span
              className="block h-full rounded-pill bg-brand"
              style={{
                width: `${String(Math.round(progress * 100))}%`,
              }}
            />
          </span>
        )}
      </li>
    );
  },
);

LessonRow.displayName = "LessonRow";
