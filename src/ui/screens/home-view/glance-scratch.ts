/**
 * Procedural scratch-out mask geometry for the live "Now" glance card.
 *
 * As the current lesson's progress moves from 0 → 1 toward the next lesson, the next lesson's
 * subject field scratches itself out from beneath the current lesson's surface. Each stroke is a
 * tapered, jagged dry-brush ribbon sweeping diagonally from the right edge (where the progress bar
 * is heading) inward across the card: fine hairline scores appear first, then lengthen, widen, and
 * multiply into overlapping torn gouges with parallel bristle streaks as the bell approaches.
 *
 * Pure and DOM-free: outputs a `data:image/svg+xml` mask URI usable directly in CSS `mask-image`
 * so the emerging layer stays a real `.u-tone-field-deep` element with full `oklab` mixing and
 * fractal grain.
 */

const CARD_VIEW = { w: 400, h: 260 } as const;
const DOCK_VIEW = { w: 400, h: 64 } as const;

export type ScratchVariant = "card" | "dock";

type ScratchKind = "gouge" | "bristle" | "fleck";

type ScratchSpec = {
  kind: ScratchKind;
  /** Progress threshold (0..1) at which this scratch begins to score through. */
  threshold: number;
  /** Origin point in viewBox coordinates (anchored near or beyond the right edge). */
  x0: number;
  y0: number;
  /** Rake direction in radians (~PI is straight left; slight tilt creates diagonal clawing). */
  angle: number;
  /** Subtle bow curvature perpendicular to the rake vector. */
  curve: number;
  /** Maximum reach across the card at progress = 1. */
  maxLength: number;
  /** Maximum half-width at peak thickness. */
  maxHalfWidth: number;
  /** Number of spine samples (higher = finer edge teeth). */
  segments: number;
  /** Deterministic per-stroke seed for edge roughness. */
  seed: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** FNV-1a 32-bit string hash so each lesson pair gets its own repeatable scratch pattern. */
const hashSeed = (input: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h || 1;
};

/** Mulberry32 deterministic PRNG returning values in [0, 1). */
const mulberry32 = (initial: number): (() => number) => {
  let state = initial >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const round1 = (n: number): string => String(Math.round(n * 10) / 10);

/**
 * Smoothly maps lesson progress (0..1) to the overall scratch/glow blend intensity (0..1).
 * Starts gently so the first minutes of a lesson stay unmistakably in the current subject,
 * then accelerates as the bell approaches.
 */
export const scratchRatio = (progress: number): number => {
  const p = clamp(progress, 0, 1);
  if (p <= 0) return 0;
  return Math.pow(p, 1.15);
};

/**
 * Deterministic list of scratch strokes for a given lesson-pair seed and geometry variant:
 * - `"card"`: tall glance card (`400×260`), steeper diagonal gouges sweeping down-left
 * - `"dock"`: compact floating dock pill (`400×64`), flatter lengthwise gouges slicing horizontally
 *   across the capsule in step with the bottom progress filament
 */
const buildSpecs = (seedKey: string, variant: ScratchVariant): ScratchSpec[] => {
  const rng = mulberry32(hashSeed(seedKey));
  const specs: ScratchSpec[] = [];
  const { w: viewW, h: viewH } = variant === "dock" ? DOCK_VIEW : CARD_VIEW;
  const isDock = variant === "dock";

  const gougeCount = isDock ? 9 : 12;
  const order = Array.from({ length: gougeCount }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }

  for (let idx = 0; idx < gougeCount; idx += 1) {
    const lane = order[idx]!;
    const yBand = isDock
      ? ((lane + 0.35) / gougeCount) * (viewH + 34) - 22
      : ((lane + 0.35) / gougeCount) * (viewH + 90) - 65;
    const y0 = yBand + (rng() - 0.5) * (isDock ? 8 : 16);
    const x0 = viewW + 14 + rng() * 28;
    const angle = isDock ? Math.PI - (0.04 + rng() * 0.09) : Math.PI - (0.18 + rng() * 0.18);
    const threshold = idx === 0 ? 0.02 : 0.05 + (idx / gougeCount) * 0.58;

    specs.push({
      kind: "gouge",
      threshold,
      x0,
      y0,
      angle,
      curve: (rng() - 0.5) * (isDock ? 9 : 22),
      maxLength: isDock ? 330 + rng() * 190 : 320 + rng() * 220,
      maxHalfWidth: isDock ? 8.5 + rng() * 7.5 : 20 + rng() * 18,
      segments: isDock ? 26 : 24,
      seed: Math.floor(rng() * 0xffffffff),
    });
  }

  /* Parallel bristle streaks: narrow, sharp dry-brush fibers flanking the main gouges. */
  const bristleCount = isDock ? 14 : 18;
  for (let i = 0; i < bristleCount; i += 1) {
    const parent = specs[i % gougeCount]!;
    const offset = (rng() - 0.5) * (isDock ? 18 : 46);
    specs.push({
      kind: "bristle",
      threshold: clamp(parent.threshold - 0.03 + rng() * 0.14, 0.01, 0.8),
      x0: parent.x0 - rng() * 24,
      y0: parent.y0 + offset,
      angle: parent.angle + (rng() - 0.5) * (isDock ? 0.04 : 0.08),
      curve: parent.curve * 0.65 + (rng() - 0.5) * (isDock ? 5 : 14),
      maxLength: parent.maxLength * (0.72 + rng() * 0.4),
      maxHalfWidth: isDock ? 1.2 + rng() * 2.2 : 2.2 + rng() * 4.8,
      segments: 20,
      seed: Math.floor(rng() * 0xffffffff),
    });
  }

  /* Micro-scratches / flecks: short, crisp scrapes scattered across the surface. */
  const fleckCount = isDock ? 10 : 14;
  for (let i = 0; i < fleckCount; i += 1) {
    const progressSlot = i / fleckCount;
    specs.push({
      kind: "fleck",
      threshold: 0.04 + progressSlot * 0.72,
      x0: viewW * (0.98 - progressSlot * 0.68) + (rng() - 0.5) * 36,
      y0: (isDock ? 4 : 10) + rng() * (viewH - (isDock ? 8 : 20)),
      angle: isDock ? Math.PI - (0.03 + rng() * 0.1) : Math.PI - (0.14 + rng() * 0.24),
      curve: (rng() - 0.5) * (isDock ? 4 : 10),
      maxLength: isDock ? 36 + rng() * 70 : 42 + rng() * 88,
      maxHalfWidth: isDock ? 0.9 + rng() * 1.6 : 1.5 + rng() * 3.2,
      segments: 12,
      seed: Math.floor(rng() * 0xffffffff),
    });
  }

  return specs;
};

/**
 * Turns one scratch spec at the current lesson progress into a closed SVG path string representing
 * a tapered, jagged ribbon polygon, or `null` if the stroke has not started yet.
 */
const buildRibbonPath = (spec: ScratchSpec, progress: number): string | null => {
  if (progress <= spec.threshold) return null;

  const localT = clamp((progress - spec.threshold) / (1 - spec.threshold), 0, 1);
  if (localT <= 0.001) return null;

  /* Score thin and fast first, then widen as the scratch wears deeper into the surface. */
  const lenFactor = 1 - Math.pow(1 - localT, 1.55);
  const widFactor = Math.pow(localT, 0.82);

  const length = spec.maxLength * lenFactor;
  const peakHalfW = spec.maxHalfWidth * widFactor;
  if (length < 4 || peakHalfW < 0.5) return null;

  const dx = Math.cos(spec.angle);
  const dy = Math.sin(spec.angle);
  const nx = -dy;
  const ny = dx;

  const rng = mulberry32(spec.seed);
  const upper: Array<[number, number]> = [];
  const lower: Array<[number, number]> = [];

  for (let i = 0; i <= spec.segments; i += 1) {
    const s = i / spec.segments;
    const dist = s * length;
    /* Gentle organic arc perpendicular to the scratch direction. */
    const bow = Math.sin(s * Math.PI) * spec.curve * lenFactor;
    const cx = spec.x0 + dx * dist + nx * bow;
    const cy = spec.y0 + dy * dist + ny * bow;

    /* Sharp needle tip at the leading end (s → 1), fuller ragged base at entry (s → 0). */
    let envelope: number;
    if (s >= 0.999) {
      envelope = 0;
    } else if (spec.kind === "fleck") {
      envelope = Math.sin(s * Math.PI);
    } else {
      const tip = Math.pow(1 - s, 0.52);
      const root = 0.72 + 0.28 * Math.min(1, s * 5);
      envelope = tip * root;
    }

    const jitterTop = 0.62 + rng() * 0.76;
    const jitterBot = 0.62 + rng() * 0.76;
    const halfTop = peakHalfW * envelope * jitterTop;
    const halfBot = peakHalfW * envelope * jitterBot;

    upper.push([cx + nx * halfTop, cy + ny * halfTop]);
    lower.push([cx - nx * halfBot, cy - ny * halfBot]);
  }

  const pts: string[] = [];
  for (let i = 0; i < upper.length; i += 1) {
    const [x, y] = upper[i]!;
    pts.push(`${i === 0 ? "M" : "L"}${round1(x)},${round1(y)}`);
  }
  for (let i = lower.length - 1; i >= 0; i -= 1) {
    const [x, y] = lower[i]!;
    pts.push(`L${round1(x)},${round1(y)}`);
  }
  pts.push("Z");
  return pts.join("");
};

/** Returns all active SVG path `d` strings at `progress` (0..1) for a deterministic `seedKey`. */
export const scratchStrokes = (
  progress: number,
  seedKey: string,
  variant: ScratchVariant = "card",
): string[] => {
  const p = clamp(progress, 0, 1);
  if (p <= 0) return [];
  const specs = buildSpecs(seedKey, variant);
  const paths: string[] = [];
  for (const spec of specs) {
    const d = buildRibbonPath(spec, p);
    if (d !== null) paths.push(d);
  }
  return paths;
};

/**
 * Builds a CSS `url("data:image/svg+xml,...")` alpha mask for the emerging next-lesson layer.
 * Returns `null` at `progress <= 0` so no mask or extra layer is needed at the start of a lesson.
 */
export const buildScratchMaskUri = (
  progress: number,
  seedKey: string,
  variant: ScratchVariant = "card",
): string | null => {
  const quantized = Math.round(clamp(progress, 0, 1) * 200) / 200;
  const strokes = scratchStrokes(quantized, seedKey, variant);
  if (strokes.length === 0) return null;

  const { w, h } = variant === "dock" ? DOCK_VIEW : CARD_VIEW;
  const pathMarkup = strokes.map((d) => `<path d="${d}" fill="#fff"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(w)} ${String(h)}" preserveAspectRatio="none">${pathMarkup}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
