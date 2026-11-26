/**
 * Pure 2D Canvas fluid renderer for the Home school tile.
 *
 * Paints a luminous, draining liquid surface whose height tracks how much of the school day
 * remains (draining toward empty as the end of the day approaches): a translucent counter-drifting
 * back wave for depth, a multi-harmonic front fluid body with a vertical warmth gradient, a soft
 * subsurface light band beneath the crest, slow rising micro-bubbles clipped inside the fluid, and
 * a crisp specular meniscus rim.
 *
 * Wavelengths and bubble spacing anchor to the tile's height (the collapsed square dimension),
 * so rendering on a full-row `100cqw` stage keeps proportions identical between collapsed and
 * expanded states. Pure and React-free so it can be tested directly without a browser.
 */

import { MAX_TILT_RAD } from "./device-tilt.ts";

export type SchoolFluidTone = "ongoing" | "ahead";

export type FluidBubble = {
  /** Base horizontal position in CSS px across the stage. */
  x: number;
  /** Vertical phase seed in `[0, 1)`. */
  phase: number;
  /** Radius in CSS px. */
  r: number;
  /** Upward drift speed in stage-heights per second. */
  speed: number;
  /** Horizontal sinusoidal sway amplitude in CSS px. */
  sway: number;
  /** Sway angular frequency. */
  swayFreq: number;
  /** Peak opacity. */
  alpha: number;
};

export type SchoolFluidPalette = {
  backWave: string;
  bodyTop: string;
  bodyMid: string;
  bodyBottom: string;
  subsurface: string;
  meniscus: string;
  bubble: string;
};

export type SchoolFluidState = {
  tone: SchoolFluidTone;
  width: number;
  height: number;
  /** Smoothed progress in `[0, 1]` that eases toward the live target progress. */
  displayFill: number;
  /** Current rendered tilt angle in radians (spring-damped toward device gravity). */
  tiltAngle: number;
  /** Angular velocity for the spring-damper tilt response. */
  tiltVelocity: number;
  /** Previous target tilt angle, used to couple brisk tilts into surface slosh. */
  lastTargetTilt: number;
  /** Horizontal pivot in CSS px around which the fluid tilts to preserve visible volume. */
  pivotX: number;
  /** Decaying slosh amplitude (`0..1`) injected on tile expand/collapse, fill step, or tilt. */
  sloshEnergy: number;
  /** Direction of the latest slosh impulse (`1` rightward, `-1` leftward). */
  sloshDir: 1 | -1;
  /** Running phase for the slosh oscillation. */
  sloshPhase: number;
  bubbles: readonly FluidBubble[];
  palette: SchoolFluidPalette;
};

const PALETTES: Record<SchoolFluidTone, SchoolFluidPalette> = {
  ongoing: {
    backWave: "rgba(220, 146, 56, 0.44)",
    bodyTop: "#f5be78",
    bodyMid: "#f2b56b",
    bodyBottom: "#df9842",
    subsurface: "rgba(255, 246, 226, 0.34)",
    meniscus: "rgba(255, 250, 240, 0.78)",
    bubble: "rgba(255, 248, 232, 1)",
  },
  ahead: {
    backWave: "rgba(156, 178, 214, 0.42)",
    bodyTop: "#d7c3a8",
    bodyMid: "#ccbda8",
    bodyBottom: "#b6b9ca",
    subsurface: "rgba(255, 250, 244, 0.28)",
    meniscus: "rgba(255, 252, 246, 0.68)",
    bubble: "rgba(255, 252, 246, 1)",
  },
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Maps logical day progress (`0..1`) to visible fluid height fraction in the tile.
 * During an ongoing school day, the vessel drains as the end of the day approaches (`0.94` → `0.14`);
 * before school starts (`ahead`), it rests as a calm low pool.
 */
export const visualFluidLevel = (tone: SchoolFluidTone, progress: number): number => {
  if (tone === "ahead") return 0.12;
  return 0.14 + (1 - clamp01(progress)) * 0.8;
};

export const createSchoolFluidState = (
  tone: SchoolFluidTone,
  width: number,
  height: number,
  initialFill: number,
  palette: SchoolFluidPalette = PALETTES[tone],
): SchoolFluidState => {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const seed = tone === "ongoing" ? 0x51a7f10d : 0x51a7a4ed;
  const rand = mulberry32(seed);
  const aspect = Math.max(1, safeW / safeH);
  const count = Math.max(7, Math.round(7 * aspect));

  const bubbles: FluidBubble[] = [];
  for (let i = 0; i < count; i++) {
    // Distribute evenly across the stage with organic jitter so no side feels bare.
    const slot = (i + 0.18 + rand() * 0.64) / count;
    bubbles.push({
      x: slot * safeW,
      phase: rand(),
      r: 1.2 + rand() * 1.6,
      speed: 0.055 + rand() * 0.055,
      sway: 2.5 + rand() * 4.5,
      swayFreq: 0.9 + rand() * 0.9,
      alpha: 0.16 + rand() * 0.18,
    });
  }

  return {
    tone,
    width: safeW,
    height: safeH,
    displayFill: clamp01(initialFill),
    tiltAngle: 0,
    tiltVelocity: 0,
    lastTargetTilt: 0,
    pivotX: safeW > safeH * 1.35 ? safeW * 0.25 : safeW * 0.5,
    sloshEnergy: 0,
    sloshDir: 1,
    sloshPhase: 0,
    bubbles,
    palette,
  };
};

/** Injects a damped physical slosh impulse (e.g. when the tile expands/collapses or ticks up). */
export const triggerSchoolFluidSlosh = (
  state: SchoolFluidState,
  direction: 1 | -1,
  strength = 0.85,
): void => {
  state.sloshEnergy = Math.min(1, Math.max(state.sloshEnergy, strength));
  state.sloshDir = direction;
};

const frontWaveY = (
  x: number,
  baseY: number,
  tileRef: number,
  amp: number,
  timeS: number,
  sloshEnergy: number,
  sloshDir: 1 | -1,
  sloshPhase: number,
): number => {
  const k1 = (Math.PI * 2) / (tileRef * 1.18);
  const k2 = (Math.PI * 2) / (tileRef * 0.62);
  const k3 = (Math.PI * 2) / (tileRef * 0.34);

  const swell = Math.sin(x * k1 - timeS * 1.15) * amp;
  const ripple = Math.sin(x * k2 + timeS * 1.75 + 1.1) * (amp * 0.42);
  const capillary = Math.sin(x * k3 - timeS * 2.55 + 2.4) * (amp * 0.16);
  const slosh =
    sloshEnergy > 0.005 ? Math.sin(x * k1 * 0.85 - sloshPhase * sloshDir) * (sloshEnergy * 4.8) : 0;

  return baseY + swell + ripple + capillary + slosh;
};

const backWaveY = (
  x: number,
  baseY: number,
  tileRef: number,
  amp: number,
  timeS: number,
  sloshEnergy: number,
  sloshDir: 1 | -1,
  sloshPhase: number,
): number => {
  const k1 = (Math.PI * 2) / (tileRef * 1.32);
  const k2 = (Math.PI * 2) / (tileRef * 0.72);
  const primary = Math.sin(x * k1 + timeS * 0.85 + 2.1) * (amp * 0.9);
  const secondary = Math.sin(x * k2 - timeS * 1.35 + 0.5) * (amp * 0.38);
  const slosh =
    sloshEnergy > 0.005
      ? Math.sin(x * k1 * 0.9 + sloshPhase * sloshDir + 1.2) * (sloshEnergy * 3.2)
      : 0;

  return baseY - 2.5 + primary + secondary + slosh;
};

const TILT_SPRING_K = 42;
const TILT_SPRING_DAMPING = 6.2;
const MAX_OVERSHOOT_TILT = MAX_TILT_RAD * 1.15;

export const renderSchoolFluidFrame = (
  ctx: CanvasRenderingContext2D,
  state: SchoolFluidState,
  targetFill: number,
  timeS: number,
  dtS: number,
  reducedMotion: boolean,
  targetTilt = 0,
  expanded = false,
): void => {
  const { width, height, palette } = state;
  const clampedTarget = clamp01(targetFill);
  const clampedTilt = Math.min(MAX_TILT_RAD, Math.max(-MAX_TILT_RAD, targetTilt));
  const targetPivotX = width > height * 1.35 && !expanded ? width * 0.25 : width * 0.5;

  if (reducedMotion) {
    state.displayFill = clampedTarget;
    state.sloshEnergy = 0;
    state.tiltAngle = 0;
    state.tiltVelocity = 0;
    state.lastTargetTilt = 0;
    state.pivotX = targetPivotX;
  } else {
    const safeDt = Math.min(0.1, Math.max(0, dtS));
    const ease = 1 - Math.exp(-3.6 * safeDt);
    state.displayFill += (clampedTarget - state.displayFill) * ease;
    if (Math.abs(clampedTarget - state.displayFill) < 0.0005) {
      state.displayFill = clampedTarget;
    }

    const pivotEase = 1 - Math.exp(-7 * safeDt);
    state.pivotX += (targetPivotX - state.pivotX) * pivotEase;

    // Couple brisk device tilt changes into surface slosh.
    const tiltDelta = clampedTilt - state.lastTargetTilt;
    state.lastTargetTilt = clampedTilt;
    if (Math.abs(tiltDelta) > 0.012) {
      triggerSchoolFluidSlosh(
        state,
        tiltDelta > 0 ? 1 : -1,
        Math.min(0.95, Math.abs(tiltDelta) * 2.6),
      );
    }

    // Playful, slightly underdamped spring-damper for liquid tilt inertia.
    if (safeDt > 0) {
      const accel =
        (clampedTilt - state.tiltAngle) * TILT_SPRING_K - state.tiltVelocity * TILT_SPRING_DAMPING;
      state.tiltVelocity += accel * safeDt;
      state.tiltAngle = Math.min(
        MAX_OVERSHOOT_TILT,
        Math.max(-MAX_OVERSHOOT_TILT, state.tiltAngle + state.tiltVelocity * safeDt),
      );
    }

    if (state.sloshEnergy > 0.004) {
      state.sloshEnergy *= Math.exp(-2.3 * safeDt);
      state.sloshPhase += safeDt * 5.2;
    } else {
      state.sloshEnergy = 0;
    }
  }

  ctx.clearRect(0, 0, width, height);

  const level = visualFluidLevel(state.tone, state.displayFill);
  const baseY = height * (1 - level);
  const tileRef = Math.max(120, height);
  const slope = Math.tan(state.tiltAngle);
  const backSlope = slope * 0.92;

  // Taper wave amplitude near the top and bottom so the surface never clips abruptly.
  const edgeEnvelope = Math.sin(Math.PI * level);
  const baseAmp = state.tone === "ahead" ? 2.4 : 2.8 + edgeEnvelope * 2.4;
  const amp = reducedMotion ? baseAmp * 0.55 : baseAmp;
  const steps = Math.max(28, Math.min(72, Math.round(width / 6)));

  // 1. Translucent back wave for depth
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const tiltOffset = (x - state.pivotX) * backSlope;
    const y = backWaveY(
      x,
      baseY + tiltOffset,
      tileRef,
      amp,
      timeS,
      state.sloshEnergy,
      state.sloshDir,
      state.sloshPhase,
    );
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = palette.backWave;
  ctx.fill();

  // Compute front wave points once so fill, subsurface glow, clip, and meniscus share one curve.
  const frontPoints: Array<{ x: number; y: number }> = [];
  let minSurfaceY = height;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const tiltOffset = (x - state.pivotX) * slope;
    const y = frontWaveY(
      x,
      baseY + tiltOffset,
      tileRef,
      amp,
      timeS,
      state.sloshEnergy,
      state.sloshDir,
      state.sloshPhase,
    );
    if (y < minSurfaceY) minSurfaceY = y;
    frontPoints.push({ x, y });
  }

  // 2. Front fluid body + clipped subsurface glow & micro-bubbles
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (const pt of frontPoints) {
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();

  const bodyGrad = ctx.createLinearGradient(0, Math.max(0, minSurfaceY - amp), 0, height);
  bodyGrad.addColorStop(0, palette.bodyTop);
  bodyGrad.addColorStop(0.38, palette.bodyMid);
  bodyGrad.addColorStop(1, palette.bodyBottom);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.clip();

  // Soft subsurface light band following the tilted surface
  ctx.save();
  ctx.translate(state.pivotX, baseY);
  ctx.rotate(state.tiltAngle);
  const bandW = width * 1.6;
  const subGrad = ctx.createLinearGradient(0, -amp, 0, 18);
  subGrad.addColorStop(0, palette.subsurface);
  subGrad.addColorStop(1, "rgba(255, 246, 226, 0)");
  ctx.fillStyle = subGrad;
  ctx.fillRect(-bandW * 0.5, -amp - 4, bandW, 26);
  ctx.restore();

  // Subtle slow-rising micro-bubbles drifting opposite to device gravity
  const fluidHeight = Math.max(12, height - minSurfaceY);
  if (fluidHeight > 22) {
    const sinTilt = Math.sin(state.tiltAngle);
    const cosTilt = Math.cos(state.tiltAngle);
    ctx.fillStyle = palette.bubble;
    for (const b of state.bubbles) {
      const progress = (b.phase + timeS * b.speed) % 1;
      const travel = progress * (fluidHeight - 6);
      const sway = Math.sin(timeS * b.swayFreq + b.phase * 12) * b.sway;
      const x = b.x + travel * sinTilt + sway * cosTilt;
      const y = height - travel * cosTilt + sway * sinTilt;
      // Smooth fade-in at bottom and fade-out before breaching the meniscus.
      const fadeIn = Math.min(1, progress * 5);
      const fadeOut = Math.min(1, (1 - progress) * 4);
      const alpha = b.alpha * fadeIn * fadeOut * (state.tone === "ahead" ? 0.65 : 1);
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // 3. Crisp specular meniscus rim along the front wave crest
  ctx.beginPath();
  for (let i = 0; i < frontPoints.length; i++) {
    const pt = frontPoints[i];
    if (pt === undefined) continue;
    if (i === 0) ctx.moveTo(pt.x, pt.y + 0.5);
    else ctx.lineTo(pt.x, pt.y + 0.5);
  }
  ctx.strokeStyle = palette.meniscus;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
};
