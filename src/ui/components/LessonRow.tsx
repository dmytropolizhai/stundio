import type { ResolvedLesson } from "../../lib/edupage/index.ts";
import { Badge, LessonCard } from "../../ds/index.ts";
import { STATUS_TONE, STATUS_TREATMENT, isChanged, subjectTone } from "../theme/index.ts";
import { useT } from "../i18n/index.ts";

/**
 * One lesson in the day list.
 *
 * A cancelled lesson stays on screen, struck through (CLAUDE.md) — hiding it would leave the
 * user wondering whether the app lost the lesson or the school did. The DS agrees: `cancelled`
 * is a treatment (dimmed, struck) rather than a removal.
 *
 * The status word is passed to the card as a `badge` rather than through its `status` prop, so
 * all six of `ResolvedStatus` survive the card's four-value visual vocabulary.
 */
export const LessonRow = ({
  lesson,
  live,
  progress,
  showTime,
  onOpen,
}: {
  lesson: ResolvedLesson;
  live: boolean;
  /** 0–1 through the lesson; only passed when `live`. */
  progress?: number;
  /** Whether times are revealed on this screen — the Day screen's own toggle. */
  showTime: boolean;
  onOpen: () => void;
}) => {
  const t = useT();
  const teachers = lesson.teachers.map((x) => x.short).join(", ");
  const rooms = lesson.rooms.map((x) => x.short).join(", ");

  /* "Now" outranks a change: it is the thing you are looking for when you open the app. */
  const status = live ? "now" : STATUS_TREATMENT[lesson.status];

  return (
    <li className="relative">
      <LessonCard
        period={t("lesson.ordinal", { n: lesson.period })}
        start={lesson.start}
        end={lesson.end}
        subject={lesson.subject?.name ?? lesson.subject?.short ?? "—"}
        {...(teachers === "" ? {} : { teacher: teachers })}
        {...(rooms === "" ? {} : { room: rooms })}
        tone={subjectTone(lesson.subject)}
        status={status}
        timeVisible={showTime}
        badge={
          live ? (
            <Badge tone="brand" data-testid="status-now">
              {t("day.now")}
            </Badge>
          ) : isChanged(lesson.status) ? (
            <Badge tone={STATUS_TONE[lesson.status]} data-testid={`status-${lesson.status}`}>
              {t(`status.${lesson.status}`)}
            </Badge>
          ) : undefined
        }
        onClick={onOpen}
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
