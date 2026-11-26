/**
 * The Home header's school tile: a lamp-tinted fluid card showing the countdown to the
 * end or start of the school day (or a later day's start time, or a resting Done/Free face).
 *
 * Interactive faces (`until` and `startsAt`) expand horizontally on tap to reveal the exact
 * `h:mm` countdown (or the later day's summary) and collapse on a second tap, outside tap,
 * Escape, or after 6 s of inactivity. The full day brief sentence stays in `aria-label`.
 */
import { useId, type CSSProperties, type RefObject } from "react";
import {
  formatCompactCountdown,
  formatFullCountdown,
  type DayBrief,
  type SchoolCountdown,
} from "@/lib/schedule";
import { useT } from "@/ui/i18n";
import { requestMotionPermissionOnce } from "./device-tilt.ts";
import { SchoolBackdrop } from "./school-backdrop.tsx";

type SchoolTone = "ongoing" | "ahead" | "resting";

const RESTING_GRADIENT =
  "linear-gradient(155deg, var(--surface-card) 0%, color-mix(in oklab, var(--surface-card) 88%, var(--lamp)) 100%)";

const DONE_GRADIENT =
  "linear-gradient(155deg, color-mix(in oklab, var(--surface-card) 84%, var(--lamp)) 0%, color-mix(in oklab, var(--surface-card) 78%, var(--lamp)) 100%)";

const SCHOOL_TEXT: Record<SchoolTone, string> = {
  ongoing: "var(--lamp-ink)",
  ahead: "var(--lamp-ink)",
  resting: "var(--text-strong)",
};

const toneOf = (countdown: SchoolCountdown): SchoolTone => {
  if (countdown.kind === "until") return countdown.target === "end" ? "ongoing" : "ahead";
  if (countdown.kind === "startsAt") return "ahead";
  return "resting";
};

type SchoolTileProps = {
  brief: DayBrief;
  countdown: SchoolCountdown;
  /** Fraction of the school day elapsed (`0..1`), or `null` when no school day applies. */
  progress?: number | null;
  /** Later-day label ("Rīt" or weekday), or `null` when about today. */
  dayLabel: string | null;
  later: boolean;
  expanded: boolean;
  onToggle: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  /** Collapsed out of sight while the weather tile is expanded. */
  hidden?: boolean;
};

export const SchoolTile = ({
  brief,
  countdown,
  progress = null,
  dayLabel,
  later,
  expanded,
  onToggle,
  buttonRef,
  hidden = false,
}: SchoolTileProps) => {
  const t = useT();
  const contentId = useId();
  const tone = toneOf(countdown);
  const interactive = countdown.kind === "until" || countdown.kind === "startsAt";

  let sentence: string;
  switch (brief.kind) {
    case "ahead":
      sentence = [
        t("home.brief.ahead", { start: brief.start }),
        t("home.brief.aheadDetail", { count: brief.lessonCount, end: brief.end }),
        dayLabel,
      ]
        .filter((part): part is string => part !== null)
        .join(". ");
      break;
    case "ongoing":
      sentence = `${t("home.brief.ongoing", { end: brief.end })}. ${t("home.brief.ongoingDetail", { count: brief.remaining })}`;
      break;
    case "finished":
      sentence = `${t("home.brief.finished")}. ${t("home.brief.finishedDetail", { end: brief.end })}`;
      break;
    case "free":
      sentence = [
        t(later ? "home.brief.freeLater" : "home.brief.free"),
        t("home.brief.freeDetail"),
        dayLabel,
      ]
        .filter((part): part is string => part !== null)
        .join(". ");
      break;
  }

  const countdownSpeech =
    countdown.kind === "until"
      ? `${formatFullCountdown(countdown)} ${t(
          countdown.target === "end" ? "home.school.untilEnd" : "home.school.untilStart",
        )}`
      : null;
  const spoken = countdownSpeech === null ? sentence : `${sentence}. ${countdownSpeech}`;
  const ariaLabel = interactive
    ? `${spoken}. ${t(expanded ? "home.school.collapse" : "home.school.expand")}`
    : sentence;

  const tileStyle: CSSProperties = {
    ...(tone === "resting"
      ? { background: countdown.kind === "done" ? DONE_GRADIENT : RESTING_GRADIENT }
      : {}),
    color: SCHOOL_TEXT[tone],
    opacity: hidden ? 0 : 1,
  };

  let figure: string;
  let showMinUnit = false;
  let sublabel: string | null = null;
  let isWordFace = false;

  switch (countdown.kind) {
    case "until": {
      if (expanded) {
        figure = formatFullCountdown(countdown);
        sublabel = t(
          countdown.target === "end" ? "home.school.untilEnd" : "home.school.untilStart",
        );
      } else {
        const compact = formatCompactCountdown(countdown);
        figure = compact.value;
        showMinUnit = compact.showMinUnit;
        // Name what the countdown runs to: a bare "until" cannot tell the end of school from its start.
        sublabel = t(
          countdown.target === "end" ? "home.school.untilEnd" : "home.school.untilStart",
        );
      }
      break;
    }
    case "startsAt": {
      figure = countdown.start;
      sublabel =
        expanded && brief.kind === "ahead"
          ? [dayLabel, t("home.brief.aheadDetail", { count: brief.lessonCount, end: brief.end })]
              .filter((part): part is string => part !== null)
              .join(" · ")
          : dayLabel;
      break;
    }
    case "done": {
      figure = t("home.school.done");
      isWordFace = true;
      break;
    }
    case "free": {
      figure = t("home.school.free");
      isWordFace = true;
      break;
    }
  }

  /* Padding lives on this inner wrapper rather than the grid item itself: a
   * border-box item with `p-4` cannot shrink narrower than its 32 px horizontal
   * padding, which kept the `0fr` track from collapsing past ~10% of the row. */
  const content = (
    <div
      id={contentId}
      aria-hidden="true"
      className="relative z-10 flex h-full w-full min-w-0 flex-col justify-end p-4"
    >
      <div
        key={expanded ? "expanded" : "compact"}
        className="flex animate-scrim-in items-baseline gap-1"
      >
        <span
          className={
            isWordFace
              ? "font-display text-display-2 leading-none font-bold tracking-display"
              : "font-display text-display-1 leading-none tabular-nums"
          }
        >
          {figure}
        </span>
        {showMinUnit && (
          <span className="font-text text-body font-bold leading-none">{t("home.school.min")}</span>
        )}
      </div>
      {sublabel !== null && (
        <span
          data-testid={countdown.kind === "startsAt" && !expanded ? "home-brief-day" : undefined}
          className="mt-1 block truncate font-text text-caption font-semibold leading-tight"
        >
          {sublabel}
        </span>
      )}
    </div>
  );

  if (!interactive) {
    return (
      <div
        data-testid="home-brief"
        role="group"
        aria-label={ariaLabel}
        inert={hidden}
        className="relative flex h-full min-w-0 overflow-hidden rounded-xl p-0 shadow-card transition-opacity duration-(--dur-slow) ease-(--ease-standard)"
        style={tileStyle}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      data-testid="home-brief"
      aria-label={ariaLabel}
      aria-expanded={expanded}
      aria-controls={contentId}
      inert={hidden}
      onClick={() => {
        void requestMotionPermissionOnce();
        onToggle();
      }}
      className="relative flex h-full min-w-0 cursor-pointer overflow-hidden rounded-xl border-0 p-0 text-left transition-[opacity,transform] duration-(--dur-slow) ease-(--ease-standard) active:scale-(--press-scale-tile) active:duration-(--dur-instant)"
      style={tileStyle}
    >
      {tone !== "resting" && (
        <SchoolBackdrop tone={tone} progress={progress ?? 0} expanded={expanded} paused={hidden} />
      )}
      {content}
    </button>
  );
};
