import * as RadixSlider from "@radix-ui/react-slider";
import { cn } from "../../lib/utils.ts";

export type SliderProps = {
  value: number;
  min: number;
  max: number;
  /** Defaults to 1 — every control the DS would sanction here is a small closed set of stops. */
  step?: number;
  onChange: (value: number) => void;
  /** Accessible name for the thumb. */
  label: string;
  /** Read out in place of the raw number (`aria-valuetext`) — a step's name, not its index. */
  valueText?: string;
  className?: string;
};

/**
 * A stepped range track. Not in the published Studio DS — no slider ships there — so this is
 * built from pieces the DS already has rather than invented whole: `SegmentedTabs`'s sunken pill
 * track becomes the groove, and the thumb is a `bg-card` circle with the same hairline ring
 * `TextField`/`Chip` use to hold an edge on a plain white surface (the switch's own thumb shadow
 * reads only because its track is never white; this thumb has to work on one).
 *
 * Ticks, not a filled range bar: colouring the "traveled" portion would reach for `--brand` or an
 * accent, and this system reserves colour for the subject index and the one electric moment
 * (focus, links) — a settings control earns neither. Motion stays on the standard easing; the
 * DS's spring is sanctioned in exactly three places and a slider thumb is not one of them.
 */
export const Slider = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  valueText,
  className,
}: SliderProps) => {
  const stops = step > 0 ? Math.round((max - min) / step) + 1 : 0;

  return (
    <RadixSlider.Root
      className={cn("relative flex h-11 w-full touch-none items-center", className)}
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={([next]) => {
        if (next !== undefined) onChange(next);
      }}
    >
      <RadixSlider.Track className="relative h-2 w-full grow rounded-pill bg-sunken">
        {stops > 2 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-between px-[3px]"
          >
            {Array.from({ length: stops }, (_, i) => (
              <span key={i} className="size-1 rounded-pill bg-ink-300" />
            ))}
          </div>
        )}
      </RadixSlider.Track>
      <RadixSlider.Thumb
        aria-label={label}
        {...(valueText === undefined ? {} : { "aria-valuetext": valueText })}
        className={cn(
          "block size-6 shrink-0 cursor-pointer rounded-pill bg-card shadow-hairline",
          "transition-transform duration-(--dur-fast) ease-(--ease-standard)",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
        )}
      />
    </RadixSlider.Root>
  );
};
