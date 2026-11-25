/**
 * The two-second answer, above the lesson list: the lesson to look at right now (or the one
 * about to start), how long until it matters, and — when the next lesson is in another
 * building — the walk. The list below stays the full day; this only lifts the one row the
 * student is actually asking about (PRODUCT.md, "the glance is the product").
 *
 * When a lesson is live, the card wears that subject's deep grainy tone field (the same surface
 * language as the Subjects tab's featured card) with an offset gradient glow matching it beneath.
 * As lesson progress climbs toward the next lesson, the next subject's field scratches itself out
 * across the card and blends into the trailing edge of the glow.
 */
import { useMemo, type CSSProperties } from "react";
import type { DayGlance as Glance } from "@/lib/schedule";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { Card, Icon } from "@/ds";
import { useAppStore } from "@/store";
import {
  isDarkTone,
  lessonAccent,
  lessonBuilding,
  toneFieldVars,
  type SubjectAccent,
} from "@/ui/theme";
import { formatDuration, useT } from "@/ui/i18n";
import { glanceWalk } from "./glance-walk.ts";
import { buildScratchMaskUri, scratchRatio } from "./glance-scratch.ts";
import { lessonHeading } from "@/ui/components/lesson-heading.ts";

type DayGlanceProps = {
  day: ResolvedDay;
  glance: Exclude<Glance, { kind: "finished" }>;
  onOpenLesson: (lesson: ResolvedLesson) => void;
};

const accentFillVar = (accent: SubjectAccent): string =>
  accent.tone === "custom" ? accent.fill : `var(--accent-${accent.tone})`;

const accentInkVar = (accent: SubjectAccent): string =>
  accent.tone === "custom" ? accent.ink : `var(--accent-${accent.tone}-ink)`;

export const DayGlance = ({ day, glance, onOpenLesson }: DayGlanceProps) => {
  const t = useT();
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const groupColorOverrides = useAppStore((s) => s.settings.groupColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);

  const { lesson } = glance;
  const { isTeacherMode, rooms, title, subtitle } = lessonHeading(lesson);
  const building = lessonBuilding(day, lesson);
  const live = glance.kind === "live";
  const previousLesson = glance.kind === "upcoming" ? glance.previous : null;
  const inBreak = previousLesson !== null;

  const baseLesson = previousLesson ?? lesson;
  const emergingLesson = live ? glance.following : inBreak ? lesson : null;

  const currentAccent = lessonAccent(
    baseLesson,
    subjectColorOverrides,
    groupColorOverrides,
    colorCodingEnabled,
  );
  const followingAccent =
    emergingLesson === null
      ? null
      : lessonAccent(
          emergingLesson,
          subjectColorOverrides,
          groupColorOverrides,
          colorCodingEnabled,
        );

  const eyebrow = live ? t("day.now") : t("day.glance.following");
  const countdown = live
    ? t("day.glance.left", { duration: formatDuration(glance.minutesLeft) })
    : t("day.glance.in", { duration: formatDuration(glance.minutesUntil) });

  /* "5 h 11 min" → ["5", "h", "11", "min"]: digits set big in mono, units small beside them. */
  const figure = formatDuration(live ? glance.minutesLeft : glance.minutesUntil)
    .split(/(\d+)/)
    .map((part) => part.trim())
    .filter((part) => part !== "");

  const walkTo = glanceWalk(glance);
  const walkBuilding = walkTo === null ? undefined : lessonBuilding(day, walkTo.to);

  const progress = live
    ? Math.min(1, Math.max(0, glance.progress))
    : inBreak
      ? Math.min(1, Math.max(0, glance.breakProgress ?? 0))
      : 0;
  const scratchInput =
    emergingLesson === null ? 0 : live ? progress : Math.min(1, 0.25 + progress * 0.72);
  const scratch = emergingLesson !== null ? scratchRatio(scratchInput) : 0;
  const scratchSeed =
    emergingLesson === null
      ? ""
      : `${baseLesson.subject?.short ?? baseLesson.subject?.name ?? baseLesson.period}->${emergingLesson.subject?.short ?? emergingLesson.subject?.name ?? emergingLesson.period}`;

  const scratchMask = useMemo(
    () =>
      emergingLesson !== null && scratchInput > 0
        ? buildScratchMaskUri(scratchInput, scratchSeed)
        : null,
    [emergingLesson, scratchInput, scratchSeed],
  );

  const currentVars = toneFieldVars(currentAccent);
  const currentDark = isDarkTone(currentAccent);
  const followingVars = followingAccent === null ? null : toneFieldVars(followingAccent);
  const followingDark = followingAccent !== null && isDarkTone(followingAccent);

  const cardVars: CSSProperties =
    followingAccent === null
      ? currentVars
      : ({
          ...currentVars,
          "--next-tone": accentFillVar(followingAccent),
          "--next-tone-ink": accentInkVar(followingAccent),
        } as CSSProperties);

  const nextGlowVars: CSSProperties | undefined =
    followingAccent === null
      ? undefined
      : ({
          "--next-tone": accentFillVar(followingAccent),
          "--next-tone-ink": accentInkVar(followingAccent),
          "--scratch": String(scratch),
        } as CSSProperties);

  if (!live && !inBreak) {
    return (
      <Card
        tone="surface"
        radius="2xl"
        elevation="card"
        className="mt-3 p-5"
        data-testid="day-glance"
        aria-label={t("day.glance.open", { title, countdown })}
        onClick={() => {
          onOpenLesson(lesson);
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="u-eyebrow inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: accentFillVar(currentAccent) }}
            />
            {eyebrow}
          </span>
          <span className="font-data text-caption font-medium tabular-nums text-muted">
            {lesson.start} – {lesson.end}
          </span>
          <span className="sr-only" data-testid="glance-countdown">
            {countdown}
          </span>
        </div>

        <p
          aria-hidden="true"
          className="mt-4 font-data text-[56px] leading-[0.95] font-semibold tracking-[-0.04em] tabular-nums text-strong"
          data-testid="glance-figure"
        >
          {figure.map((part, i) =>
            /^\d+$/.test(part) ? (
              <span key={i}>{part}</span>
            ) : (
              <span key={i} className="mx-1 font-text text-body-lg font-medium text-muted">
                {part}
              </span>
            ),
          )}
        </p>

        <h2 className="mt-3 font-display text-display-2 font-semibold tracking-display text-strong">
          {title}
        </h2>
        {subtitle !== undefined && <p className="font-text text-caption text-muted">{subtitle}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-text text-body font-bold">
          {!isTeacherMode && rooms !== "" && (
            <span className="flex items-center gap-1.5" data-testid="glance-room">
              <Icon name="map-pin" size={16} className="shrink-0" />
              {rooms}
            </span>
          )}
          {building !== undefined && (
            <span className="flex items-center gap-1.5" data-testid="glance-building">
              <Icon name="building-2" size={16} className="shrink-0" />
              {building}
            </span>
          )}
        </div>

        {walkTo !== null && walkBuilding !== undefined && (
          <p
            className="mt-3 flex items-center gap-2 font-text text-caption font-medium text-caution"
            data-testid="glance-walk"
          >
            <Icon name="triangle-alert" size={16} className="shrink-0" />
            {walkTo.from === null
              ? t("day.glance.walk", { building: walkBuilding })
              : t("day.glance.walkFrom", { from: walkTo.from, building: walkBuilding })}
          </p>
        )}
      </Card>
    );
  }

  return (
    <div className="relative mt-3 rounded-2xl">
      <div
        aria-hidden="true"
        data-testid="glance-glow"
        className="u-glance-glow"
        style={currentVars}
        {...(currentDark ? { "data-tone-dark": "" } : {})}
      >
        {nextGlowVars !== undefined && scratch > 0 && (
          <div
            data-testid="glance-glow-next"
            className="u-glance-glow-next"
            style={nextGlowVars}
            {...(followingDark ? { "data-tone-dark": "" } : {})}
          />
        )}
      </div>

      <Card
        tone="custom"
        radius="2xl"
        elevation="raised"
        className="u-tone-field u-tone-field-deep relative z-10 overflow-hidden p-5 text-on-deep"
        style={cardVars}
        {...(currentDark ? { "data-tone-dark": "" } : {})}
        data-testid="day-glance"
        aria-label={t("day.glance.open", { title, countdown })}
        onClick={() => {
          onOpenLesson(lesson);
        }}
      >
        {scratchMask !== null && followingVars !== null && (
          <div
            aria-hidden="true"
            data-testid="glance-scratch-layer"
            data-scratch={String(Math.round(scratch * 100))}
            className="u-tone-field u-tone-field-deep pointer-events-none !absolute inset-0 rounded-[inherit]"
            style={{
              ...followingVars,
              maskImage: scratchMask,
              WebkitMaskImage: scratchMask,
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
            {...(followingDark ? { "data-tone-dark": "" } : {})}
          />
        )}

        <div className="relative z-[2]">
          <span className="sr-only">{eyebrow}</span>
          <span className="sr-only" data-testid="glance-countdown">
            {countdown}
          </span>

          <div className="flex items-start justify-between gap-3">
            <p
              aria-hidden="true"
              className="font-data text-[56px] leading-[0.95] font-semibold tracking-[-0.04em] tabular-nums text-on-deep"
              data-testid="glance-figure"
            >
              {figure.map((part, i) =>
                /^\d+$/.test(part) ? (
                  <span key={i}>{part}</span>
                ) : (
                  <span key={i} className="mx-1 font-text text-body-lg font-medium text-on-deep/75">
                    {part}
                  </span>
                ),
              )}
            </p>
            <span className="pt-1 font-data text-caption font-medium tabular-nums text-on-deep/80">
              {lesson.start} – {lesson.end}
            </span>
          </div>

          <h2 className="mt-3 font-display text-display-2 font-semibold tracking-display text-on-deep">
            {title}
          </h2>
          {subtitle !== undefined && (
            <p className="font-text text-caption text-on-deep/80">{subtitle}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-text text-body font-bold text-on-deep/95">
            {!isTeacherMode && rooms !== "" && (
              <span className="flex items-center gap-1.5" data-testid="glance-room">
                <Icon name="map-pin" size={16} className="shrink-0" />
                {rooms}
              </span>
            )}
            {building !== undefined && (
              <span className="flex items-center gap-1.5" data-testid="glance-building">
                <Icon name="building-2" size={16} className="shrink-0" />
                {building}
              </span>
            )}
          </div>

          <span
            aria-hidden="true"
            className="mt-4 block h-1.5 overflow-hidden rounded-pill bg-on-deep/20"
          >
            <span
              data-testid="glance-progress-fill"
              className="block h-full rounded-pill transition-[width] duration-(--dur-base) ease-(--ease-standard)"
              style={{
                width: `${String(Math.round(progress * 100))}%`,
                background:
                  followingAccent !== null
                    ? "linear-gradient(90deg, color-mix(in oklab, var(--tone) 38%, var(--on-deep)) 0%, var(--next-tone) 100%)"
                    : "color-mix(in oklab, var(--tone) 30%, var(--on-deep))",
              }}
            />
          </span>

          {live && glance.following !== null && (
            <p
              className="mt-3 flex items-center gap-2 font-text text-caption font-medium text-on-deep/85"
              data-testid="glance-following"
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full ring-1 ring-on-deep/35"
                style={{ backgroundColor: "var(--next-tone)" }}
              />
              <span className="min-w-0 truncate">
                {t("day.glance.following")}: {lessonHeading(glance.following).title}
              </span>
            </p>
          )}

          {walkTo !== null && walkBuilding !== undefined && (
            <p
              className="mt-3 inline-flex items-center gap-2 rounded-pill bg-warning px-3 py-1.5 font-text text-caption font-semibold text-caution-ink"
              data-testid="glance-walk"
            >
              <Icon name="triangle-alert" size={16} className="shrink-0" />
              {walkTo.from === null
                ? t("day.glance.walk", { building: walkBuilding })
                : t("day.glance.walkFrom", { from: walkTo.from, building: walkBuilding })}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
