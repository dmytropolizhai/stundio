/**
 * Proportional liquid-glass event card for the 2D Week Calendar canvas.
 *
 * Mirrors HomeView's `DayGlassLesson` grammar so the whole app speaks one Night/Day visual
 * language: dusk-toned period jewel, subtle radial caustic refraction (or solid dusk fill when
 * `lessonCardStyle === "filled"`), recessed room capsule, `StatusDot` for substitutions, and
 * `.u-tone-field-deep` with a live progress filament for the lesson in progress.
 */
import { memo, type CSSProperties } from "react";
import type { TeacherResolvedLesson } from "@/lib/edupage";
import { Icon, cn } from "@/ds";
import {
  isChanged,
  isDarkTone,
  lessonAccent,
  lessonBuilding,
  subjectCode,
  toneFieldVars,
  type SubjectAccent,
} from "@/ui/theme";
import { StatusDot } from "@/ui/components/Badge.tsx";
import { lessonHeading } from "@/ui/components/lesson-heading.ts";
import { useT } from "@/ui/i18n";
import type { CalendarEventBlock } from "./week-calendar-layout.ts";

export type CalendarDensity = "detailed" | "overview";

const accentFillVar = (accent: SubjectAccent): string =>
  accent.tone === "custom" ? accent.fill : `var(--accent-${accent.tone})`;

const accentInkVar = (accent: SubjectAccent): string =>
  accent.tone === "custom" ? accent.ink : `var(--accent-${accent.tone}-ink)`;

type WeekCalendarEventProps = {
  block: CalendarEventBlock;
  weekdayLabel: string;
  topPx: number;
  heightPx: number;
  density: CalendarDensity;
  filled: boolean;
  isPast: boolean;
  progress: number | undefined;
  subjectColorOverrides: Record<string, string>;
  groupColorOverrides: Record<string, string>;
  colorCodingEnabled: boolean;
  highlightCoverLessons: boolean;
  onSelect: (block: CalendarEventBlock) => void;
};

const horizontalLaneStyle = (lane: number, laneCount: number): CSSProperties => {
  if (laneCount <= 1) return { left: "3px", right: "3px" };
  const gap = 3;
  const inset = 3;
  const totalPadding = inset * 2 + gap * (laneCount - 1);
  const widthExpr = `calc((100% - ${String(totalPadding)}px) / ${String(laneCount)})`;
  if (lane === 0) {
    return { left: `${String(inset)}px`, width: widthExpr };
  }
  const leftExpr = `calc(${String(inset)}px + ${String(lane)} * ((100% - ${String(totalPadding)}px) / ${String(laneCount)} + ${String(gap)}px))`;
  return { left: leftExpr, width: widthExpr };
};

export const WeekCalendarEvent = memo(
  ({
    block,
    weekdayLabel,
    topPx,
    heightPx,
    density,
    filled,
    isPast,
    progress,
    subjectColorOverrides,
    groupColorOverrides,
    colorCodingEnabled,
    highlightCoverLessons,
    onSelect,
  }: WeekCalendarEventProps) => {
    const t = useT();
    const { lesson, day, live, lane, laneCount, end } = block;

    const teacherLesson = lesson as Partial<TeacherResolvedLesson>;
    const { isTeacherMode, rooms, title: headingTitle, subtitle } = lessonHeading(lesson);
    const subjectName = lesson.subject?.name ?? lesson.subject?.short ?? headingTitle;
    const classNames = teacherLesson.classes?.map((c) => c.short || c.name).join(" + ");
    const fullDisplayName = classNames ? `${subjectName} (${classNames})` : subjectName;
    const teachers = lesson.teachers.map((x) => x.short).join(", ");
    const building = lessonBuilding(day, lesson);
    const cancelled = lesson.status === "cancelled";
    const changed = !live && isChanged(lesson.status);
    const isAdded = !live && lesson.status === "added";
    const isCover = lesson.isCover === true || teacherLesson.role === "cover";
    const hasNote = (lesson.noteRefs?.length ?? 0) > 0;

    const accent = lessonAccent(
      lesson,
      subjectColorOverrides,
      groupColorOverrides,
      colorCodingEnabled,
    );
    const darkTone = isDarkTone(accent);

    const isOverview = density === "overview";
    const isMultiLane = laneCount > 1;
    const isTall = heightPx >= 112;
    const isCompactHeight = heightPx < 58;

    const timeRange = `${lesson.start}–${end}`;
    // The room code leads the short name; its "(…)" floor/wing suffix only truncates at card width.
    const roomLabel = rooms.replace(/\s*\(.*$/, "").trim() || rooms;
    const styleVars = {
      ...(live ? toneFieldVars(accent) : {}),
      "--row-tone": accentFillVar(accent),
      "--row-ink": accentInkVar(accent),
      top: `${String(topPx)}px`,
      height: `${String(Math.max(28, heightPx))}px`,
      ...horizontalLaneStyle(lane, laneCount),
    } as unknown as CSSProperties;

    const titleText = building === undefined ? fullDisplayName : `${fullDisplayName} · ${building}`;

    const ariaLabel = [
      fullDisplayName,
      weekdayLabel,
      timeRange,
      rooms !== "" ? rooms : null,
      building ?? null,
      cancelled ? t("status.cancelled") : null,
    ]
      .filter((part): part is string => part !== null && part !== "")
      .join(" · ");

    const cardTitle = isTeacherMode ? headingTitle : subjectName;
    const overviewLabel = isTeacherMode
      ? (classNames ?? headingTitle)
      : subjectCode(lesson.subject);

    const secondaryMeta = (() => {
      const parts: string[] = [];
      if (isTeacherMode && subtitle !== undefined) parts.push(subtitle);
      if (!isTeacherMode && teachers !== "") parts.push(teachers);
      if (isMultiLane && lesson.group !== null) {
        parts.unshift(`${t("settings.subgroup")} ${lesson.group}`);
      }
      return parts.join(" · ");
    })();

    const useFilledLook = filled && !live && !cancelled;

    return (
      <button
        type="button"
        data-testid="week-cell"
        data-tone={accent.tone}
        data-live={live ? "true" : undefined}
        data-past={isPast && !cancelled ? "true" : undefined}
        {...(live ? { "aria-current": "time" as const } : {})}
        {...(live && darkTone ? { "data-tone-dark": "" } : {})}
        aria-label={ariaLabel}
        title={titleText}
        onClick={() => {
          onSelect(block);
        }}
        style={styleVars}
        className={cn(
          "group absolute z-10 flex cursor-pointer flex-col overflow-hidden rounded-[13px] border-0 text-left",
          "transition-[transform,box-shadow,opacity,background] duration-(--dur-fast) ease-(--ease-out) active:scale-[0.985]",
          "focus-visible:z-30 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--focus-ring)",
          isOverview ? "px-1.5 py-1" : isMultiLane ? "px-2 py-1.5" : "px-2.5 py-1.5",
          live
            ? "u-tone-field u-tone-field-deep text-on-deep shadow-raised"
            : cancelled
              ? "u-week-event-cancelled text-muted opacity-55 hover:opacity-80"
              : useFilledLook
                ? "u-week-event-filled"
                : "u-week-event text-strong",
          !live && !cancelled && isPast && "opacity-72 hover:opacity-100 focus-visible:opacity-100",
          !live && !cancelled && changed && !isAdded && "inset-ring-1 inset-ring-caution/60",
          isAdded && "inset-ring-1 inset-ring-success/55",
          isCover && highlightCoverLessons && "inset-ring-2 inset-ring-warning",
        )}
      >
        {isOverview ? (
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-0.5">
            <div className="flex items-center justify-between gap-1">
              <span
                className={cn(
                  "truncate font-display text-[11px] leading-tight font-bold tracking-[-0.015em]",
                  live
                    ? "text-on-deep"
                    : cancelled
                      ? "text-muted"
                      : useFilledLook
                        ? "text-(--row-ink)"
                        : "text-strong",
                  cancelled && "line-through",
                )}
              >
                {overviewLabel}
              </span>
              {live ? (
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--lamp)" }}
                />
              ) : (
                changed && <StatusDot status={lesson.status} />
              )}
            </div>

            {!isCompactHeight && rooms !== "" && (
              <span
                className={cn(
                  "truncate font-data text-micro leading-none font-medium tabular-nums",
                  live ? "text-on-deep/80" : useFilledLook ? "text-(--row-ink)/80" : "text-muted",
                  cancelled && "line-through",
                )}
              >
                {roomLabel}
              </span>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-1">
            {/* Top utility row: period jewel + NOW/room capsule + status dot */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                {live && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-on-deep/18 px-1.5 py-0.5 font-text text-micro leading-none font-bold tracking-[0.08em] text-on-deep uppercase ring-1 ring-on-deep/20">
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: "var(--lamp)" }}
                    />
                    {t("day.now")}
                  </span>
                )}

                {!live && hasNote && (
                  <Icon
                    name="info"
                    size={12}
                    className={cn("shrink-0", useFilledLook ? "text-(--row-ink)/75" : "text-muted")}
                  />
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {!isTeacherMode && rooms !== "" && (
                  <span
                    className={cn(
                      "max-w-[4.5rem] shrink-0 truncate rounded-pill px-1.5 py-0.5 font-data text-micro leading-none font-semibold tabular-nums",
                      live
                        ? "bg-on-deep/16 text-on-deep"
                        : cancelled
                          ? "bg-sunken/80 text-muted"
                          : useFilledLook
                            ? "bg-black/10 text-(--row-ink)"
                            : "u-schedule-room-pill text-strong",
                      cancelled && "line-through",
                    )}
                  >
                    {roomLabel}
                  </span>
                )}
                {changed && <StatusDot status={lesson.status} />}
              </div>
            </div>

            {/* Full unabbreviated subject title */}
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "font-display font-bold tracking-[-0.02em]",
                  isMultiLane ? "text-caption leading-[1.16]" : "text-[13.5px] leading-[1.2]",
                  isTall || isMultiLane ? "line-clamp-3" : "line-clamp-2",
                  live
                    ? "text-on-deep"
                    : cancelled
                      ? "text-muted"
                      : useFilledLook
                        ? "text-(--row-ink)"
                        : "text-strong",
                  cancelled && "line-through",
                )}
              >
                {cardTitle}
              </div>

              {isTall && secondaryMeta !== "" && (
                <div
                  className={cn(
                    "mt-0.5 truncate font-text text-micro leading-snug",
                    live ? "text-on-deep/80" : useFilledLook ? "text-(--row-ink)/80" : "text-muted",
                    cancelled && "line-through",
                  )}
                >
                  {secondaryMeta}
                </div>
              )}
            </div>

            {/* Bottom detail line: teacher/building when space permits */}
            {!isCompactHeight &&
              !isMultiLane &&
              ((!isTall && secondaryMeta !== "") || building !== undefined) && (
                <div className="flex items-center justify-between gap-1.5">
                  {!isTall && secondaryMeta !== "" && (
                    <span
                      className={cn(
                        "min-w-0 truncate font-text text-micro leading-none",
                        live
                          ? "text-on-deep/78"
                          : useFilledLook
                            ? "text-(--row-ink)/78"
                            : "text-muted",
                      )}
                    >
                      {secondaryMeta}
                    </span>
                  )}

                  {building !== undefined && (
                    <span
                      className={cn(
                        "inline-flex max-w-[5rem] shrink-0 items-center gap-0.5 truncate rounded-pill px-1.5 py-0.5 font-text text-micro leading-none font-semibold",
                        live
                          ? "bg-on-deep/18 text-on-deep"
                          : useFilledLook
                            ? "bg-black/10 text-(--row-ink)"
                            : "bg-(--schedule-room-bg) text-strong",
                      )}
                    >
                      <Icon name="building-2" size={10} className="shrink-0" />
                      <span className="truncate">{building}</span>
                    </span>
                  )}
                </div>
              )}
          </div>
        )}

        {/* Live progress filament along the bottom edge */}
        {live && progress !== undefined && (
          <span
            aria-hidden="true"
            className="pointer-events-none !absolute inset-x-0 bottom-0 z-[3] h-[3px] overflow-hidden bg-on-deep/18"
          >
            <span
              className="block h-full rounded-r-pill"
              style={{
                width: `${String(Math.round(Math.min(1, Math.max(0, progress)) * 100))}%`,
                background: "color-mix(in oklab, var(--lamp) 75%, var(--on-deep))",
              }}
            />
          </span>
        )}
      </button>
    );
  },
);

WeekCalendarEvent.displayName = "WeekCalendarEvent";
