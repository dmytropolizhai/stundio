import type { ResolvedLesson } from "@/lib/edupage";
import { Badge, LessonCard } from "@/ds";
import { STATUS_TREATMENT, isChanged, subjectTone } from "@/ui/theme";
import { useAppStore } from "@/store";
import { StatusDot } from "./Badge.tsx";
import { useT } from "@/ui/i18n";

/**
 * One lesson in the day list.
 *
 * A cancelled lesson stays on screen, struck through (CLAUDE.md) — hiding it would leave the
 * user wondering whether the app lost the lesson or the school did. The DS agrees: `cancelled`
 * is a treatment (dimmed, struck) rather than a removal.
 *
 * The status still drives the card's four-value visual vocabulary through its `status` prop.
 * Its exact word no longer sits on the card face, though: a change gets the small corner
 * `StatusDot` instead of a text `Badge`, so the list stays a glance rather than a caption
 * reel — the word (and the before/after) surfaces in the lesson sheet on tap. "Now" is not a
 * change and keeps its own text badge, since it's the one thing worth reading without opening
 * anything.
 */
export const LessonRow = ({
  lesson,
  live,
  progress,
  showTime,
  building,
  onOpen,
}: {
  lesson: ResolvedLesson;
  live: boolean;
  /** 0–1 through the lesson; only passed when `live`. */
  progress?: number;
  /** Whether times are revealed on this screen — the Day screen's own toggle. */
  showTime: boolean;
  /** The day's building, passed only when it isn't the school's main building. */
  building?: string;
  /**
   * Omitted by the onboarding tour, which renders these cards as an illustration: without a
   * handler the DS card drops its cursor and press-scale, so a sample lesson doesn't advertise
   * a tap that leads nowhere.
   */
  onOpen?: () => void;
}) => {
  const t = useT();
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);
  const filled = useAppStore((s) => s.settings.lessonCardStyle) === "filled";
  const teachers = lesson.teachers.map((x) => x.short).join(", ");
  const rooms = lesson.rooms.map((x) => x.short).join(", ");

  /* "Now" outranks a change: it is the thing you are looking for when you open the app. */
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
            style={{ width: `${String(Math.round(progress * 100))}%` }}
          />
        </span>
      )}
    </li>
  );
};
