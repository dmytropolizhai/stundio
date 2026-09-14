import { memo } from "react";
import type { ResolvedLesson } from "@/lib/edupage";
import { Badge, LessonCard } from "@/ds";
import { STATUS_TREATMENT, isChanged, subjectTone, type SubjectTone } from "@/ui/theme";
import { StatusDot } from "./Badge.tsx";
import { useT } from "@/ui/i18n";

type LessonRowProps = {
  lesson: ResolvedLesson;
  live: boolean;
  progress?: number;
  showTime: boolean;
  building?: string;
  subjectColorOverrides: Record<string, SubjectTone>;
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

    const teachers = lesson.teachers.map((x) => x.short).join(", ");
    const rooms = lesson.rooms.map((x) => x.short).join(", ");

    const status = live ? "now" : STATUS_TREATMENT[lesson.status];

    return (
      <li className="relative">
        <LessonCard
          period={lesson.period}
          start={lesson.start}
          end={lesson.end}
          subject={lesson.subject?.name ?? lesson.subject?.short ?? "—"}
          {...(teachers === "" ? {} : { teacher: teachers })}
          {...(rooms === "" ? {} : { room: rooms })}
          {...(building === undefined ? {} : { building })}
          tone={subjectTone(lesson.subject, subjectColorOverrides, colorCodingEnabled)}
          filled={filled}
          status={status}
          timeVisible={showTime}
          badge={
            live ? (
              <Badge tone="brand" data-testid="status-now">
                {t("day.now")}
              </Badge>
            ) : undefined
          }
          indicator={
            !live && isChanged(lesson.status) ? <StatusDot status={lesson.status} /> : undefined
          }
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
