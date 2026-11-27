/**
 * The brand mark as a frosted-glass vessel filling with a rising liquid wave — the one moving
 * thing on the splash.
 *
 * The mark is not inlined as JSX. It is applied as a CSS *mask* (`mask-image: url(/mark.svg)`),
 * so the artwork stays a single file a designer can replace without touching this component: only
 * its alpha silhouette matters, never its colours.
 *
 * Optical stack (back to front):
 *   1. Soft ambient lamp/mist light field so `backdrop-filter` has real luminance to refract.
 *   2. Blurred contour shadow on a sibling underlayer (never an ancestor `filter`, which would
 *      block `backdrop-filter` in Chromium/WebKit).
 *   3. Frosted-glass vessel masked to `mark.svg` holding the rising two-crest liquid wave with a
 *      specular meniscus, a diagonal surface sheen + slow glint sweep, and top-left / bottom-right
 *      specular bevels carved via shifted `mask-composite: exclude` copies of `mark.svg`.
 */
import type { CSSProperties } from "react";

/**
 * Two full periods of a sine-ish wave across a 200-wide box, closed downwards so the shape
 * fills everything under the crest. Midline is y=12, amplitude 12, period 100 — shifting by
 * exactly half the width lands on an identical phase.
 */
const CREST_PATH = "M0 12C12.5 0 37.5 0 50 12S87.5 24 100 12S137.5 0 150 12S187.5 24 200 12V40H0Z";

/** Open top contour of `CREST_PATH` for the specular liquid meniscus highlight. */
const MENISCUS_PATH = "M0 12C12.5 0 37.5 0 50 12S87.5 24 100 12S137.5 0 150 12S187.5 24 200 12";

/** Rendered height of a crest strip, in px. The body is parked directly under it. */
const CREST_H = 24;

/**
 * `contain` + `center` means `mark.svg`'s own viewBox decides the silhouette's aspect ratio;
 * the square box is only the space it is fitted into.
 */
const MARK_MASK: CSSProperties = {
  maskImage: "url(/mark.svg)",
  WebkitMaskImage: "url(/mark.svg)",
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskPosition: "center",
  WebkitMaskPosition: "center",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};

const Crest = ({
  className,
  fill,
  meniscus,
  top,
}: {
  className: string;
  fill: string;
  meniscus?: boolean;
  top: number;
}) => (
  <svg
    viewBox="0 0 200 40"
    preserveAspectRatio="none"
    aria-hidden="true"
    className={`absolute left-0 w-[200%] ${className}`}
    style={{ top, height: CREST_H }}
  >
    <path d={CREST_PATH} fill={fill} />
    {meniscus && (
      <path
        d={MENISCUS_PATH}
        fill="none"
        stroke="var(--mark-wave-meniscus)"
        strokeWidth="2.2"
        vectorEffect="non-scaling-stroke"
      />
    )}
  </svg>
);

export type WaveMarkProps = {
  /** How full the mark is, 0–100. Animated by the caller; transitioned here. */
  level: number;
  /** Edge length of the (square) mark box, in px. */
  size?: number;
  className?: string;
};

export const WaveMark = ({ level, size = 144, className }: WaveMarkProps) => {
  return (
    <div
      className={`relative select-none ${className ?? ""}`}
      style={{ width: size, height: size }}
      data-testid="wave-mark"
      data-level={level}
    >
      {/* Ambient refraction field behind the frosted glass vessel. */}
      <div
        aria-hidden="true"
        className="u-mark-glass-ambient pointer-events-none absolute -inset-16 rounded-full"
      />

      {/* Contour-matching soft floor shadow on a sibling layer so backdrop-filter stays active. */}
      <div aria-hidden="true" className="u-mark-glass-shadow pointer-events-none absolute inset-0">
        <div
          className="h-full w-full"
          style={{ ...MARK_MASK, backgroundColor: "var(--mark-shadow-color)" }}
        />
      </div>

      {/* Frosted-glass vessel clipped to the exact mark silhouette. */}
      <div
        className="u-mark-glass-vessel relative h-full w-full overflow-hidden"
        style={MARK_MASK}
        data-testid="wave-mark-glass"
      >
        {/*
          The lift. `translateY(100%)` parks the liquid entirely below the mark (empty);
          `translateY(0)` would overfill it. Duration is deliberately long and the easing is
          decelerating: the rise should read as liquid finding its level, not as a progress bar
          snapping. The bob lives one node deeper because it owns `transform` too.
        */}
        <div
          className="absolute inset-0 transition-transform duration-450 ease-standard motion-reduce:transition-none"
          style={{ transform: `translateY(${String(100 - level)}%)` }}
        >
          <div className="absolute inset-0 animate-wave-bob">
            <Crest top={0} fill="var(--mark-wave-back)" className="animate-wave-drift-slow" />
            <Crest top={4} fill="var(--mark-wave-front)" meniscus className="animate-wave-drift" />
            {/* Hangs a full box-height below the crest so the body never runs out at low levels. */}
            <div
              className="absolute inset-x-0 h-full"
              style={{ top: CREST_H + 3, background: "var(--mark-wave-body)" }}
            />
          </div>
        </div>

        {/* Diagonal glass sheen, slow specular glint, and contour-hugging bevel rims. */}
        <div
          aria-hidden="true"
          className="u-mark-glass-sheen pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="u-mark-glass-glint animate-mark-glint pointer-events-none absolute inset-0 motion-reduce:animate-none"
        />
        <div
          aria-hidden="true"
          className="u-mark-glass-rim-top pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="u-mark-glass-rim-bottom pointer-events-none absolute inset-0"
        />
      </div>
    </div>
  );
};
