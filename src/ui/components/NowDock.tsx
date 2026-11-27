/**
 * Compact floating "Now" dock pill sitting directly above `TabBar` on phones, sharing the
 * contextual dock slot with `DateDock`.
 *
 * The 52 px capsule wears the subject's deep grainy field with an offset gradient-matching glow
 * beneath. Both during a live lesson (`current → following`) and during a break between lessons
 * (`previous → upcoming`), the next subject's field scratches itself lengthwise across the pill as
 * the 3 px bottom progress filament approaches the bell. Tapping the pill opens `LessonSheet` from
 * any tab; on Home and Week a trailing calendar button flips the slot over to `DateDock`.
 */
import { useMemo, type CSSProperties } from "react";
import type { DayGlance as Glance } from "@/lib/schedule";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { Icon } from "@/ds";
import { useAppStore } from "@/store";
import {
  isDarkTone,
  lessonAccent,
  lessonBuilding,
  toneFieldVars,
  type SubjectAccent,
} from "@/ui/theme";
import { formatDuration, useT } from "@/ui/i18n";
import { buildScratchMaskUri, glanceWalk, scratchRatio } from "@/ui/screens/home-view";
import { lessonHeading } from "./lesson-heading.ts";

type NowDockProps = {
  day: ResolvedDay;
  glance: Exclude<Glance, { kind: "finished" }>;
  onOpenLesson: (lesson: ResolvedLesson) => void;
  /** When provided (Home and Week), renders a trailing button to flip the dock to `DateDock`. */
  onShowDateDock?: () => void;
  /** Runs the horizontal Apple-style spring "bimp" expansion from the `DateDock` Now chip. */
  animateFrom?: "chip";
};

const accentFillVar = (accent: SubjectAccent): string =>
  accent.tone === "custom" ? accent.fill : `var(--accent-${accent.tone})`;

const accentInkVar = (accent: SubjectAccent): string =>
  accent.tone === "custom" ? accent.ink : `var(--accent-${accent.tone}-ink)`;

export const NowDock = ({
  day,
  glance,
  onOpenLesson,
  onShowDateDock,
  animateFrom,
}: NowDockProps) => {
  const t = useT();
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const groupColorOverrides = useAppStore((s) => s.settings.groupColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);

  const { lesson } = glance;
  const { isTeacherMode, rooms, title } = lessonHeading(lesson);
  const building = lessonBuilding(day, lesson);
  const live = glance.kind === "live";
  const previousLesson = glance.kind === "upcoming" ? glance.previous : null;
  const inBreak = previousLesson !== null;

  /* Live: current lesson is the base, following scratches in.
     Break: previous lesson is the base, upcoming lesson scratches in.
     Before first lesson: upcoming lesson is the base, no scratch layer. */
  const baseLesson = previousLesson ?? lesson;
  const emergingLesson = live ? glance.following : inBreak ? lesson : null;

  const baseAccent = lessonAccent(
    baseLesson,
    subjectColorOverrides,
    groupColorOverrides,
    colorCodingEnabled,
  );
  const emergingAccent =
    emergingLesson === null
      ? null
      : lessonAccent(
          emergingLesson,
          subjectColorOverrides,
          groupColorOverrides,
          colorCodingEnabled,
        );

  const minutes = live ? glance.minutesLeft : glance.minutesUntil;
  const durationText = formatDuration(minutes);
  const countdown = live
    ? t("day.glance.left", { duration: durationText })
    : t("day.glance.in", { duration: durationText });

  const walkTo = glanceWalk(glance);
  const walkBuilding = walkTo === null ? undefined : lessonBuilding(day, walkTo.to);

  const progress = live
    ? Math.min(1, Math.max(0, glance.progress))
    : inBreak
      ? Math.min(1, Math.max(0, glance.breakProgress ?? 0))
      : 0;
  /* During a break the previous lesson has already ended, so keep the next subject visibly
     scratching through from the start of the break (25% → 97%) as the bell approaches. */
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
        ? buildScratchMaskUri(scratchInput, scratchSeed, "dock")
        : null,
    [emergingLesson, scratchInput, scratchSeed],
  );

  const baseVars = toneFieldVars(baseAccent);
  const baseDark = isDarkTone(baseAccent);
  const emergingVars = emergingAccent === null ? null : toneFieldVars(emergingAccent);
  const emergingDark = emergingAccent !== null && isDarkTone(emergingAccent);

  const pillVars: CSSProperties =
    emergingAccent === null
      ? baseVars
      : ({
          ...baseVars,
          "--next-tone": accentFillVar(emergingAccent),
          "--next-tone-ink": accentInkVar(emergingAccent),
        } as CSSProperties);

  const nextGlowVars: CSSProperties | undefined =
    emergingAccent === null
      ? undefined
      : ({
          "--next-tone": accentFillVar(emergingAccent),
          "--next-tone-ink": accentInkVar(emergingAccent),
          "--scratch": String(scratch),
        } as CSSProperties);

  const metaParts: string[] = [];
  if (!isTeacherMode && rooms !== "") metaParts.push(rooms);
  if (building !== undefined) metaParts.push(building);
  const metaText = metaParts.join(" · ");
  const showProgressBar = live || inBreak;

  return (
    <div
      className={
        animateFrom === "chip"
          ? "u-dock-bimp-from-chip pointer-events-auto relative w-full rounded-pill"
          : "pointer-events-auto relative w-full rounded-pill"
      }
    >
      <div
        aria-hidden="true"
        data-testid="now-dock-glow"
        className="u-glance-glow u-glance-glow-dock"
        style={baseVars}
        {...(baseDark ? { "data-tone-dark": "" } : {})}
      >
        {nextGlowVars !== undefined && scratch > 0 && (
          <div
            data-testid="now-dock-glow-next"
            className="u-glance-glow-next"
            style={nextGlowVars}
            {...(emergingDark ? { "data-tone-dark": "" } : {})}
          />
        )}
      </div>

      <div
        data-testid="now-dock"
        data-kind={glance.kind}
        className="u-tone-field u-tone-field-deep relative z-10 flex h-[52px] w-full items-center gap-2 overflow-hidden rounded-pill pr-2 pl-4 text-on-deep shadow-raised"
        style={pillVars}
        {...(baseDark ? { "data-tone-dark": "" } : {})}
      >
        {scratchMask !== null && emergingVars !== null && (
          <div
            aria-hidden="true"
            data-testid="now-dock-scratch-layer"
            data-scratch={String(Math.round(scratch * 100))}
            className="u-tone-field u-tone-field-deep pointer-events-none !absolute inset-0 rounded-[inherit]"
            style={{
              ...emergingVars,
              maskImage: scratchMask,
              WebkitMaskImage: scratchMask,
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
            {...(emergingDark ? { "data-tone-dark": "" } : {})}
          />
        )}

        <button
          type="button"
          className="u-dock-bimp-content relative z-[2] flex h-full min-w-0 flex-1 cursor-pointer items-center justify-between gap-2.5 text-left transition-transform duration-(--dur-instant) active:scale-[0.99]"
          aria-label={t("day.glance.open", { title, countdown })}
          onClick={() => {
            onOpenLesson(lesson);
          }}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[15px] leading-tight font-bold tracking-[-0.015em] text-on-deep">
              {title}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 font-text text-[12px] leading-tight font-medium text-on-deep/80">
              {metaText !== "" && <span className="shrink-0">{metaText}</span>}
              {walkTo !== null && walkBuilding !== undefined ? (
                <span
                  data-testid="now-dock-walk"
                  className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-warning px-1.5 py-0.5 font-text text-[10px] leading-none font-bold text-caution-ink"
                >
                  <Icon name="triangle-alert" size={10} className="shrink-0" />
                  {walkBuilding}
                </span>
              ) : live && glance.following !== null ? (
                <span
                  data-testid="now-dock-following"
                  className="flex min-w-0 items-center gap-1 text-on-deep/80"
                >
                  {metaText !== "" && <span aria-hidden="true">·</span>}
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full ring-1 ring-on-deep/35"
                    style={{ backgroundColor: "var(--next-tone)" }}
                  />
                  <span className="truncate">{lessonHeading(glance.following).title}</span>
                </span>
              ) : (
                !live && (
                  <span className="font-data text-[11px] tabular-nums text-on-deep/75">
                    {metaText !== "" ? `· ${lesson.start}` : lesson.start}
                  </span>
                )
              )}
            </span>
          </span>

          <span className="shrink-0 pr-1 text-right">
            <span
              aria-hidden="true"
              className="block font-data text-[17px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-on-deep"
            >
              {durationText}
            </span>
            <span className="sr-only" data-testid="now-dock-countdown">
              {countdown}
            </span>
          </span>
        </button>

        {onShowDateDock !== undefined && (
          <button
            type="button"
            data-testid="now-dock-date-toggle"
            aria-label={t("day.openCalendar")}
            title={t("day.openCalendar")}
            onClick={onShowDateDock}
            className="u-dock-bimp-content relative z-[2] flex size-[34px] shrink-0 before:absolute before:-inset-[5px] before:content-[''] cursor-pointer items-center justify-center rounded-full bg-on-deep/15 text-on-deep ring-1 ring-on-deep/20 transition-transform duration-(--dur-instant) ease-standard active:scale-(--press-scale)"
          >
            <Icon name="calendar-days" size={15} />
          </button>
        )}

        {showProgressBar && (
          <span
            aria-hidden="true"
            className="pointer-events-none !absolute inset-x-0 bottom-0 z-[3] h-[3px] bg-on-deep/15"
          >
            <span
              data-testid="now-dock-progress"
              className="block h-full transition-[width] duration-(--dur-base) ease-(--ease-standard)"
              style={{
                width: `${String(Math.round(progress * 100))}%`,
                background:
                  emergingAccent !== null
                    ? "linear-gradient(90deg, color-mix(in oklab, var(--tone) 38%, var(--on-deep)) 0%, var(--next-tone) 100%)"
                    : "color-mix(in oklab, var(--tone) 30%, var(--on-deep))",
              }}
            />
          </span>
        )}
      </div>
    </div>
  );
};
