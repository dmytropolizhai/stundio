import { Fragment, useMemo, type ReactNode } from "react";
import { motion, type MotionValue } from "framer-motion";
import type { ISODate, ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { FREE_PERIOD_MIN_MINUTES, minutesOf } from "@/lib/schedule";
import { lessonBuilding } from "@/ui/theme";
import { LessonRow } from "@/ui/components/LessonRow.tsx";
import { useT } from "@/ui/i18n";
import { DayGap } from "./day-gap.tsx";
import { DayNowMarker } from "./day-now-marker.tsx";

type DayLessonListProps = {
  day: ResolvedDay;
  date: ISODate;
  now: { date: ISODate; minutes: number };
  progress: { current: ResolvedLesson | null; progress: number | null };
  showTime: boolean;
  subjectColorOverrides: Record<string, string>;
  colorCodingEnabled: boolean;
  filled: boolean;
  x: MotionValue<number>;
  opacity: MotionValue<number>;
  dragging: boolean;
  onOpenLesson: (lesson: ResolvedLesson) => void;
};

export const DayLessonList = ({
  day,
  date,
  now,
  progress,
  showTime,
  subjectColorOverrides,
  colorCodingEnabled,
  filled,
  x,
  opacity,
  dragging,
  onOpenLesson,
}: DayLessonListProps) => {
  const t = useT();

  const rows = useMemo(() => {
    const items: { key: string; node: ReactNode }[] = [];

    let markerDrawn = date !== now.date;
    let previousEnd: number | null = null;

    day.lessons.forEach((lesson, index) => {
      const start = minutesOf(lesson.start);

      if (
        previousEnd !== null &&
        start !== null &&
        start - previousEnd >= FREE_PERIOD_MIN_MINUTES
      ) {
        items.push({
          key: `gap-${String(index)}`,
          node: <DayGap minutes={start - previousEnd} label={t("day.free")} />,
        });
      }

      if (!markerDrawn && start !== null && start > now.minutes) {
        markerDrawn = true;

        items.push({
          key: "now",
          node: <DayNowMarker label={t("day.now")} />,
        });
      }

      const live = progress.current === lesson;
      const building = lessonBuilding(day, lesson);

      items.push({
        key: `${lesson.period}-${lesson.subject?.id ?? "x"}-${lesson.group ?? ""}`,
        node: (
          <LessonRow
            lesson={lesson}
            live={live}
            showTime={showTime}
            subjectColorOverrides={subjectColorOverrides}
            colorCodingEnabled={colorCodingEnabled}
            filled={filled}
            {...(live && progress.progress !== null ? { progress: progress.progress } : {})}
            {...(building === undefined ? {} : { building })}
            onOpen={onOpenLesson}
          />
        ),
      });

      const end = minutesOf(lesson.end);

      if (end !== null) {
        previousEnd = end;
      }
    });

    return items;
  }, [
    day,
    date,
    now.date,
    now.minutes,
    progress,
    showTime,
    subjectColorOverrides,
    colorCodingEnabled,
    filled,
    t,
    onOpenLesson,
  ]);

  return (
    <motion.ul
      className="mt-3 flex flex-col gap-3"
      style={{
        x,
        opacity,
        willChange: dragging ? "transform" : "auto",
      }}
    >
      {rows.map((row) => (
        <Fragment key={row.key}>{row.node}</Fragment>
      ))}
    </motion.ul>
  );
};
