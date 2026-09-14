import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Icon } from "@/ds";
import { cn, pressable } from "../../lib/utils.ts";

/** The six subject accents plus brand. A subject keeps its tone everywhere in the app. */
export type LessonTone = "amber" | "sky" | "lilac" | "pink" | "mint" | "lime" | "brand";

/**
 * Visual treatment, not the full domain vocabulary.
 *
 * Stundio's `ResolvedStatus` has six members (canceled, moved, substituted, room_change, added,
 * normal), and the DS card has four. Rather than collapse the domain into the DS's set, this drives
 * only the *treatment* — dimming, strikethrough, the brand ring on "now" — and the exact word is
 * passed in through `badge`, so the app keeps all six and renders them with the DS `Badge`.
 */
export type LessonStatus = "normal" | "now" | "cancelled" | "substitute";

const lessonCardVariants = cva(
  [
    "relative grid grid-cols-[auto_1fr] items-stretch gap-3.5 rounded-xl p-4",
    "transition-transform duration-(--dur-instant) ease-(--ease-out)",
  ],
  {
    variants: {
      filled: { true: "shadow-none", false: "bg-card text-strong shadow-card" },
      tone: {
        amber: "",
        sky: "",
        lilac: "",
        pink: "",
        mint: "",
        lime: "",
        brand: "",
      },
      cancelled: { true: "opacity-55", false: "" },
      interactive: {
        true: "cursor-pointer active:scale-(--press-scale-tile)",
        false: "cursor-default",
      },
    },
    compoundVariants: [
      { filled: true, tone: "amber", class: "bg-amber text-amber-ink" },
      { filled: true, tone: "sky", class: "bg-sky text-sky-ink" },
      { filled: true, tone: "lilac", class: "bg-lilac text-lilac-ink" },
      { filled: true, tone: "pink", class: "bg-pink text-pink-ink" },
      { filled: true, tone: "mint", class: "bg-mint text-mint-ink" },
      { filled: true, tone: "lime", class: "bg-lime text-lime-ink" },
      { filled: true, tone: "brand", class: "bg-brand text-on-brand" },
    ],
    defaultVariants: {
      filled: false,
      tone: "sky",
      cancelled: false,
      interactive: false,
    },
  },
);

/** The 4px rail is the only place a subject's color appears on an unfilled card. */
const RAIL: Record<LessonTone, string> = {
  amber: "bg-amber",
  sky: "bg-sky",
  lilac: "bg-lilac",
  pink: "bg-pink",
  mint: "bg-mint",
  lime: "bg-lime",
  brand: "bg-brand",
};

export type LessonCardProps = Omit<ComponentPropsWithoutRef<"div">, "children"> &
  Pick<VariantProps<typeof lessonCardVariants>, "filled"> & {
    /** Rendered verbatim — the caller formats and translates it ("3. stunda"). */
    period?: ReactNode;
    start: string;
    end: string;
    subject: ReactNode;
    teacher?: ReactNode;
    room?: ReactNode;
    /**
     * The lesson's building, passed only when it is not the school's main building — the caller
     * (`LessonRow`) already knows this from `ResolvedDay.building`. Draws the same hairline
     * outline the week grid uses for the same fact, plus a labelled line so the signal isn't
     * colour-only.
     */
    building?: ReactNode;
    tone?: LessonTone;
    status?: LessonStatus;
    /** The status chip. The app supplies its own `Badge` so all six statuses survive. */
    badge?: ReactNode;
    /**
     * A small overlay pinned to the card's top-right corner — a quieter alternative to `badge`
     * for a change that doesn't need to shout. The exact word still has to reach the lesson
     * sheet on tap; the card itself only needs to say "something here changed."
     */
    indicator?: ReactNode;
    /**
     * Whether `start`/`end` render at all. Defaults to visible; the Day screen defaults its own
     * toggle to hidden and passes `false` until the student asks to see times. Each time this
     * flips to `true` the digits mount fresh, so the reveal animation (`studio-time-in`) replays.
     */
    timeVisible?: boolean;
  };

export const LessonCard = ({
  className,
  period,
  start,
  end,
  subject,
  teacher,
  room,
  building,
  tone = "sky",
  status = "normal",
  filled = false,
  badge,
  indicator,
  timeVisible = true,
  onClick,
  ...props
}: LessonCardProps) => {
  const cancelled = status === "cancelled";
  const interactive = onClick !== undefined;

  /* On a filled card the ink pair carries every string; on white the DS splits strong vs. muted. */
  const meta = filled ? "opacity-75" : "text-muted";

  return (
    <div
      {...pressable(onClick)}
      className={cn(
        lessonCardVariants({ filled, tone, cancelled, interactive }),
        status === "now" && !filled && "inset-ring-2 inset-ring-brand",
        status !== "now" &&
          building !== undefined &&
          !filled &&
          "inset-ring-2 inset-ring-strong-border",
        className,
      )}
      {...props}
    >
      {indicator !== undefined && <span className="absolute top-3 right-3">{indicator}</span>}

      <div className="flex items-center gap-3">
        {timeVisible && (
          <div className="flex min-w-11.5 flex-col items-start justify-between py-0.5">
            <span
              className={cn(
                "u-data origin-top animate-time-in font-bold",
                cancelled && "line-through",
              )}
            >
              {start}
            </span>

            <span className={cn("u-data origin-bottom animate-time-in text-[12px]", meta)}>
              {end}
            </span>
          </div>
        )}

        {period !== undefined && (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              "font-text",
              filled ? "bg-current/15" : cn(RAIL[tone], "text-black"),
              cancelled && "line-through",
            )}
          >
            {period}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        {badge !== undefined && <div className="flex flex-wrap items-center gap-2">{badge}</div>}

        <h3
          className={cn(
            "m-0 font-display text-title tracking-display text-current",
            cancelled && "line-through",
          )}
        >
          {subject}
        </h3>

        {(room !== undefined || teacher !== undefined || building !== undefined) && (
          <div className={cn("flex flex-wrap gap-3.5 font-text text-caption", meta)}>
            {room !== undefined && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="map-pin" size={14} />
                {room}
              </span>
            )}

            {teacher !== undefined && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="user-round" size={14} />
                {teacher}
              </span>
            )}

            {building !== undefined && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="building-2" size={14} />
                {building}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
