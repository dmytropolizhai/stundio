import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Icon } from "./icon.tsx";
import { cn } from "../../lib/utils.ts";

/** The six subject accents plus brand. A subject keeps its tone everywhere in the app. */
export type LessonTone = "amber" | "sky" | "lilac" | "pink" | "mint" | "lime" | "brand";

/**
 * Visual treatment, not the full domain vocabulary.
 *
 * Studio's `ResolvedStatus` has six members (cancelled, moved, substituted, room_change, added,
 * normal) and the DS card has four. Rather than collapse the domain into the DS's set, this drives
 * only the *treatment* — dimming, strikethrough, the brand ring on "now" — and the exact word is
 * passed in through `badge`, so the app keeps all six and renders them with the DS `Badge`.
 */
export type LessonStatus = "normal" | "now" | "cancelled" | "substitute";

const lessonCardVariants = cva(
  [
    "grid grid-cols-[auto_1fr] items-stretch gap-3.5 rounded-xl p-4",
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
      { filled: true, tone: "brand", class: "bg-brand text-white" },
    ],
    defaultVariants: { filled: false, tone: "sky", cancelled: false, interactive: false },
  },
);

/** The 4px rail is the only place a subject's colour appears on an unfilled card. */
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
    tone?: LessonTone;
    status?: LessonStatus;
    /** The status chip. The app supplies its own `Badge` so all six statuses survive. */
    badge?: ReactNode;
  };

export const LessonCard = ({
  className,
  period,
  start,
  end,
  subject,
  teacher,
  room,
  tone = "sky",
  status = "normal",
  filled = false,
  badge,
  onClick,
  ...props
}: LessonCardProps) => {
  const cancelled = status === "cancelled";
  const interactive = onClick !== undefined;
  /* On a filled card the ink pair carries every string; on white the DS splits strong vs muted. */
  const meta = filled ? "opacity-75" : "text-muted";

  return (
    <div
      onClick={onClick}
      {...(interactive ? { role: "button", tabIndex: 0 } : {})}
      className={cn(
        lessonCardVariants({ filled, tone, cancelled, interactive }),
        status === "now" && !filled && "inset-ring-2 inset-ring-brand",
        className,
      )}
      {...props}
    >
      <div className="flex gap-3">
        <div className="flex min-w-[46px] flex-col items-start">
          <span className={cn("u-data font-bold", cancelled && "line-through")}>{start}</span>
          <span className={cn("u-data text-[12px]", meta)}>{end}</span>
        </div>
        <span className={cn("w-1 rounded-pill", filled ? "bg-current opacity-35" : RAIL[tone])} />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        {(period !== undefined || badge !== undefined) && (
          <div className="flex flex-wrap items-center gap-2">
            {period !== undefined && (
              <span
                className={cn(
                  "font-text text-micro font-bold tracking-label uppercase",
                  filled ? "opacity-80" : "text-muted",
                )}
              >
                {period}
              </span>
            )}
            {badge}
          </div>
        )}
        <h3
          className={cn(
            "m-0 font-display text-title tracking-display text-current",
            cancelled && "line-through",
          )}
        >
          {subject}
        </h3>
        {(room !== undefined || teacher !== undefined) && (
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
          </div>
        )}
      </div>
    </div>
  );
};
