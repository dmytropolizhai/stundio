import { memo } from "react";
import type { ResolvedLesson, TeacherResolvedLesson } from "@/lib/edupage";
import { Badge, LessonCard } from "@/ds";
import { STATUS_TREATMENT, isChanged, lessonAccent } from "@/ui/theme";
import { StatusDot } from "./Badge.tsx";
import { useT } from "@/ui/i18n";
import { useAppStore } from "@/store";
import { lessonHeading } from "./lesson-heading.ts";

type LessonRowProps = {
  lesson: ResolvedLesson;
  live: boolean;
  progress?: number;
  showTime: boolean;
  building?: string;
  subjectColorOverrides: Record<string, string>;
  colorCodingEnabled: boolean;
  filled: boolean;
  /** One of two groups sharing a period: half-width card, labelled with its group. */
  half?: boolean;
  onOpen?: (lesson: ResolvedLesson) => void;
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
    half = false,
    onOpen,
  }: LessonRowProps) => {
    const t = useT();
    const highlightCoverLessons = useAppStore((s) => s.settings.highlightCoverLessons);
    const groupColorOverrides = useAppStore((s) => s.settings.groupColorOverrides);

    const teacherLesson = lesson as Partial<TeacherResolvedLesson>;
    const { isTeacherMode, rooms, title: subject, subtitle: baseSubtitle } = lessonHeading(lesson);
    const subtitle =
      half && lesson.group !== null ? `${t("settings.subgroup")} ${lesson.group}` : baseSubtitle;
    const teachers = lesson.teachers.map((x) => x.short).join(", ");

    const isCover = lesson.isCover === true || teacherLesson.role === "cover";
    const coverBadgeText = teacherLesson.coverFor?.name
      ? t("teacher.coverFor", { name: teacherLesson.coverFor.name })
      : teacherLesson.coverFor?.short
        ? t("teacher.coverFor", { name: teacherLesson.coverFor.short })
        : t("teacher.cover");

    const status = live ? "now" : STATUS_TREATMENT[lesson.status];
    const accent = lessonAccent(
      lesson,
      subjectColorOverrides,
      groupColorOverrides,
      colorCodingEnabled,
    );

    const hasNote = (lesson.noteRefs?.length ?? 0) > 0;

    const Wrapper = half ? "div" : "li";

    return (
      <Wrapper className={half ? "relative min-w-0" : "relative"}>
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
          compact={half}
          badge={
            live || isCover || hasNote ? (
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
                {hasNote && (
                  <Badge tone="quiet" data-testid="lesson-note-badge" aria-label={t("lesson.note")}>
                    {t("lesson.note")}
                  </Badge>
                )}
              </div>
            ) : undefined
          }
          indicator={
            !live && isChanged(lesson.status) ? <StatusDot status={lesson.status} /> : undefined
          }
          className={isCover && highlightCoverLessons ? "ring-2 ring-warning" : undefined}
          {...(onOpen === undefined
            ? {}
            : {
                onClick: () => {
                  onOpen(lesson);
                },
              })}
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
      </Wrapper>
    );
  },
);

LessonRow.displayName = "LessonRow";
