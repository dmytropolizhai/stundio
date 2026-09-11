import type { ResolvedLesson } from "../../lib/edupage/index.ts";
import { Badge, LessonCard } from "../../ds/index.ts";
import { STATUS_TONE, STATUS_TREATMENT, isChanged, subjectTone } from "../theme/index.ts";
import { useClassSubjectTones } from "../hooks/useSubjectTones.ts";
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
  past = false,
  onOpen,
}: {
  lesson: ResolvedLesson;
  live: boolean;
  /** 0–1 through the lesson; only passed when `live`. */
  progress?: number;
  /** A lesson whose end time has already passed, today. Dims it a notch below the rest. */
  past?: boolean;
  onOpen: () => void;
}) => {
  const t = useT();
  const tones = useClassSubjectTones();
  const teachers = lesson.teachers.map((x) => x.short).join(", ");
  const rooms = lesson.rooms.map((x) => x.short).join(", ");

  /*
   * The GlanceCard above the list now owns "now" and carries the one brand ring for it, so the
   * row no longer rings itself — DESIGN.md's One Voice Rule budgets one or two electric elements
   * per screen, and a live day was spending six. The row still identifies itself as the current
   * lesson through its badge and progress bar, in ink rather than brand.
   */
  const status = STATUS_TREATMENT[lesson.status];

  return (
    <li className="relative">
      <LessonCard
        period={t("lesson.ordinal", { n: lesson.period })}
        start={lesson.start}
        end={lesson.end}
        subject={lesson.subject?.name ?? lesson.subject?.short ?? "—"}
        {...(teachers === "" ? {} : { teacher: teachers })}
        {...(rooms === "" ? {} : { room: rooms })}
        tone={subjectTone(lesson.subject, tones)}
        status={status}
        past={past}
        badge={
          live ? (
            <Badge tone="ink" data-testid="status-now">
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
            className="block h-full rounded-pill bg-ink-900"
            style={{ width: `${String(Math.round(progress * 100))}%` }}
          />
        </span>
      )}
    </li>
  );
};
