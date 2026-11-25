/**
 * Liquid-glass lesson row for the Home screen's Day schedule.
 *
 * Built around a 2-second corridor scan:
 * - Left spine: period jewel in the subject's dusk tone (connected across consecutive rows inside
 *   a slab by an optical spine thread, with optional Martian Mono start/end times).
 * - Center: subject heading (or group · room in teacher mode) and quiet single-line metadata.
 * - Trailing right edge: recessed liquid-glass room capsule so rooms align down a scannable column,
 *   paired with the accessible change indicator dot when modified.
 *
 * Keeps `LessonRow` / `LessonCard` untouched for the Changes screen while preserving every domain
 * cue (subgroup pairing, teacher mode, cancellations, cover highlights, custom subject tints).
 */
import { memo, type CSSProperties, type KeyboardEvent } from "react";
import type { ResolvedLesson, TeacherResolvedLesson } from "@/lib/edupage";
import { Badge, Icon, cn, type LessonTone } from "@/ds";
import { STATUS_TREATMENT, isChanged, lessonAccent, type SubjectAccent } from "@/ui/theme";
import { StatusDot } from "@/ui/components/Badge.tsx";
import { lessonHeading } from "@/ui/components/lesson-heading.ts";
import { useT } from "@/ui/i18n";
import { useAppStore } from "@/store";

const ORB_TONE: Record<Exclude<LessonTone, "custom">, string> = {
  amber: "bg-amber text-amber-ink",
  sky: "bg-sky text-sky-ink",
  lilac: "bg-lilac text-lilac-ink",
  pink: "bg-pink text-pink-ink",
  mint: "bg-mint text-mint-ink",
  lime: "bg-lime text-lime-ink",
  brand: "bg-brand text-on-brand",
};

const accentVar = (accent: SubjectAccent): string =>
  accent.tone === "custom" ? accent.fill : `var(--accent-${accent.tone})`;

type DayGlassLessonProps = {
  lesson: ResolvedLesson;
  live: boolean;
  /** True on today once this lesson has already ended. */
  passed?: boolean;
  progress?: number;
  showTime: boolean;
  building?: string;
  subjectColorOverrides: Record<string, string>;
  colorCodingEnabled: boolean;
  filled: boolean;
  /** Optical vertical spine connectors inside a multi-row slab. */
  connectTop?: boolean;
  connectBottom?: boolean;
  /** One of two subgroups sharing a period: half-width compact cell inside a paired row. */
  half?: boolean;
  onOpen?: (lesson: ResolvedLesson) => void;
};

export const DayGlassLesson = memo(
  ({
    lesson,
    live,
    passed = false,
    progress,
    showTime,
    building,
    subjectColorOverrides,
    colorCodingEnabled,
    filled,
    connectTop = false,
    connectBottom = false,
    half = false,
    onOpen,
  }: DayGlassLessonProps) => {
    const t = useT();
    const highlightCoverLessons = useAppStore((s) => s.settings.highlightCoverLessons);
    const groupColorOverrides = useAppStore((s) => s.settings.groupColorOverrides);

    const teacherLesson = lesson as Partial<TeacherResolvedLesson>;
    const {
      isTeacherMode,
      rooms,
      originalSubjectName,
      title: subject,
      subtitle: baseSubtitle,
    } = lessonHeading(lesson);
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
    const cancelled = status === "cancelled";
    const changed = !live && isChanged(lesson.status);
    const accent = lessonAccent(
      lesson,
      subjectColorOverrides,
      groupColorOverrides,
      colorCodingEnabled,
    );
    const hasNote = (lesson.noteRefs?.length ?? 0) > 0;
    const interactive = onOpen !== undefined;

    const toneVars = { "--row-tone": accentVar(accent) } as CSSProperties;

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (!interactive) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(lesson);
      }
    };

    const showStudentRoom = !isTeacherMode && rooms !== "" && !cancelled;
    const hasTrailing = !half && (showStudentRoom || changed);

    const secondaryParts: string[] = [];
    if (!half && subtitle !== undefined) secondaryParts.push(subtitle);
    if (!isTeacherMode && cancelled && rooms !== "") secondaryParts.push(rooms);
    if (!isTeacherMode && teachers !== "") secondaryParts.push(teachers);
    const secondaryLine = secondaryParts.join(" · ");

    const hasSecondary =
      secondaryLine !== "" || originalSubjectName !== undefined || building !== undefined;

    const periodJewel = (
      <div className="relative flex shrink-0 items-center justify-center self-stretch">
        {!half && connectTop && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-1/2 left-1/2 w-px -translate-x-1/2 bg-(--schedule-spine)"
          />
        )}
        {!half && connectBottom && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 bottom-0 left-1/2 w-px -translate-x-1/2 bg-(--schedule-spine)"
          />
        )}
        <div className="relative flex items-center justify-center">
          {!filled && !cancelled && (
            <span
              aria-hidden="true"
              className={cn(
                "u-schedule-orb-halo pointer-events-none absolute -inset-2.5 rounded-full transition-opacity duration-(--dur-fast)",
                live ? "opacity-75" : passed ? "opacity-30" : "opacity-55 group-hover:opacity-80",
              )}
            />
          )}
          <span
            className={cn(
              "relative z-10 flex shrink-0 items-center justify-center rounded-full font-data font-bold tabular-nums",
              half ? "size-7.5 text-caption" : "size-9 text-[14px]",
              "shadow-[inset_0_1px_1px_rgba(255,255,255,0.48),0_1px_2px_rgba(18,20,25,0.1)]",
              accent.tone === "custom" ? "" : ORB_TONE[accent.tone],
              passed && !cancelled && "opacity-78 saturate-[0.82]",
              cancelled && "line-through",
            )}
            style={
              accent.tone === "custom"
                ? { backgroundColor: accent.fill, color: accent.ink }
                : undefined
            }
          >
            {lesson.period}
          </span>
        </div>
      </div>
    );

    const roomPill = showStudentRoom ? (
      <span
        className={cn(
          "u-schedule-room-pill inline-flex max-w-[7.25rem] shrink-0 items-center truncate rounded-pill font-data font-semibold tabular-nums",
          half ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
          live ? "text-lamp-ink dark:text-lamp-text" : passed ? "text-fg" : "text-strong",
          cancelled && "line-through",
        )}
      >
        {rooms}
      </span>
    ) : null;

    const badges =
      live || isCover || hasNote ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {live && (
            <Badge tone="brand" className="bg-lamp text-lamp-ink" data-testid="status-now">
              <span
                aria-hidden="true"
                className="mr-1 inline-block size-1.5 rounded-full bg-lamp-ink"
              />
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
      ) : null;

    const content = (
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={
          interactive
            ? () => {
                onOpen(lesson);
              }
            : undefined
        }
        onKeyDown={interactive ? handleKeyDown : undefined}
        data-testid={`lesson-${lesson.period}`}
        data-live={live ? "true" : undefined}
        data-passed={passed ? "true" : undefined}
        style={toneVars}
        className={cn(
          "group relative grid transition-[background-color,transform] duration-(--dur-instant) ease-(--ease-out)",
          "focus-visible:z-20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)",
          half
            ? "h-full grid-cols-1 content-start gap-2 px-3.5 py-3"
            : hasTrailing
              ? "grid-cols-[auto_1fr_auto] items-center gap-3 px-3.5 py-3"
              : "grid-cols-[auto_1fr] items-center gap-3 px-3.5 py-3",
          interactive ? "cursor-pointer active:scale-[0.99]" : "cursor-default",
          !live && filled && "u-schedule-row-tinted",
          !live && !filled && !cancelled && "u-schedule-row-caustic",
          !live && "hover:bg-(--schedule-row-hover)",
          live && half && "u-schedule-glass-live rounded-xl",
          cancelled && "opacity-55",
          isCover && highlightCoverLessons && "inset-ring-2 inset-ring-warning",
        )}
      >
        {half ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {periodJewel}
              {subtitle !== undefined && (
                <span
                  className={cn(
                    "truncate font-text text-micro font-bold text-muted",
                    cancelled && "line-through",
                  )}
                >
                  {subtitle}
                </span>
              )}
            </div>
            {(roomPill !== null || changed) && (
              <div className="flex shrink-0 items-center gap-1.5">
                {roomPill}
                {changed && <StatusDot status={lesson.status} />}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 self-stretch">
            {showTime && (
              <div className="flex min-w-11 flex-col items-start justify-center gap-0.5">
                <span
                  className={cn(
                    "u-data origin-top animate-time-in text-[13px] leading-none font-bold",
                    passed ? "text-fg" : "text-strong",
                    cancelled && "line-through",
                  )}
                >
                  {lesson.start}
                </span>
                <span className="u-data origin-bottom animate-time-in text-[11px] leading-none text-muted">
                  {lesson.end}
                </span>
              </div>
            )}
            {periodJewel}
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-1">
          {badges}

          <h3
            className={cn(
              "m-0 font-display leading-[1.2] font-bold tracking-[-0.02em]",
              half ? "text-[15px]" : "text-[16px]",
              live ? "text-strong" : passed ? "text-fg" : "text-strong",
              cancelled && "line-clamp-2 line-through",
            )}
          >
            {subject}
          </h3>

          {hasSecondary && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-text text-[12.5px] leading-snug text-muted">
              {secondaryLine !== "" && (
                <span className={cn("min-w-0 truncate", cancelled && "line-through")}>
                  {secondaryLine}
                </span>
              )}

              {originalSubjectName !== undefined && (
                <span className="truncate line-through opacity-75">{originalSubjectName}</span>
              )}

              {building !== undefined && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-(--schedule-room-bg) px-2 py-0.5 font-text text-[11px] leading-none font-semibold text-strong">
                  <Icon name="building-2" size={11} className="shrink-0" />
                  {building}
                </span>
              )}
            </div>
          )}
        </div>

        {hasTrailing && (
          <div className="flex shrink-0 items-center gap-2">
            {roomPill}
            {changed && <StatusDot status={lesson.status} />}
          </div>
        )}

        {live && progress !== undefined && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-lamp/20"
          >
            <span
              data-testid="live-lesson-progress"
              className="block h-full rounded-r-pill bg-lamp-mark dark:bg-lamp"
              style={{
                width: `${String(Math.round(Math.min(1, Math.max(0, progress)) * 100))}%`,
              }}
            />
          </span>
        )}
      </div>
    );

    if (half) {
      return <div className="relative min-w-0">{content}</div>;
    }

    return <li className="relative list-none">{content}</li>;
  },
);

DayGlassLesson.displayName = "DayGlassLesson";
