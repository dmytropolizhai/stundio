/**
 * The brand mark filling with a rising wave — the one moving thing on the splash.
 *
 * The mark is not inlined as JSX. It is applied as a CSS *mask* over a plain water layer
 * (`mask-image: url(/Mark.svg)`), so the artwork stays a single file a designer can replace
 * without touching this component: only its alpha silhouette matters, never its colours. The
 * consequence — and the point — is that nothing outside the silhouette is ever painted, which
 * is what makes the un-filled part invisible rather than ghosted.
 *
 * The water itself is three stacked pieces: two crest svgs (each 200% wide and holding two
 * full sine periods, so the `-50%` drift loops seamlessly) and a solid body hanging below
 * them. `level` moves the whole stack vertically; the crests and the bob keep it alive when
 * `level` is sitting still.
 */

/**
 * Two full periods of a sine-ish wave across a 200-wide box, closed downwards so the shape
 * fills everything under the crest. Midline is y=12, amplitude 12, period 100 — shifting by
 * exactly half the width lands on an identical phase.
 */
const CREST_PATH = "M0 12C12.5 0 37.5 0 50 12S87.5 24 100 12S137.5 0 150 12S187.5 24 200 12V40H0Z";

/** Rendered height of a crest strip, in px. The body is parked directly under it. */
const CREST_H = 24;

const Crest = ({ className, top }: { className: string; top: number }) => (
  <svg
    viewBox="0 0 200 40"
    preserveAspectRatio="none"
    aria-hidden="true"
    className={`absolute left-0 w-[200%] ${className}`}
    style={{ top, height: CREST_H }}
  >
    <path d={CREST_PATH} />
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
  // `contain` + `center` means the file's own viewBox decides the silhouette's aspect ratio;
  // the box below is only the space it is fitted into.
  const mask = {
    width: size,
    height: size,
    maskImage: "url(/Mark.svg)",
    WebkitMaskImage: "url(/Mark.svg)",
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  } as const;

  return (
    <div className={className} style={mask} data-testid="wave-mark" data-level={level}>
      <div className="relative h-full w-full overflow-hidden">
        {/*
          The lift. `translateY(100%)` parks the water entirely below the mark (empty);
          `translateY(0)` would overfill it. Duration is deliberately long and the easing is
          decelerating: the rise should read as water finding its level, not as a progress bar
          snapping. The bob lives one node deeper because it owns `transform` too.
        */}
        <div
          className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--ease-standard)] motion-reduce:transition-none"
          style={{ transform: `translateY(${String(100 - level)}%)` }}
        >
          <div className="absolute inset-0 animate-wave-bob">
            <Crest top={0} className="animate-wave-drift-slow fill-hero-lift opacity-60" />
            <Crest top={4} className="animate-wave-drift fill-hero" />
            {/* Hangs a full box-height below the crest so the body never runs out at low levels. */}
            <div className="absolute inset-x-0 h-full bg-hero" style={{ top: CREST_H + 3 }} />
          </div>
        </div>
      </div>
    </div>
  );
};
