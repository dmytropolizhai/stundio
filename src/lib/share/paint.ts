/**
 * Replays a `ShareImageLayout` onto a 2D context. No decisions are made here — the layout
 * already made them — which is what keeps the geometry testable without a canvas.
 *
 * The context is described structurally rather than as `CanvasRenderingContext2D` so a test can
 * hand in a recorder, and so nothing here depends on a browser surface existing.
 */
import type { ShareImageLayout, ShareOp } from "./layout.ts";

export type ShareContext = {
  save: () => void;
  restore: () => void;
  scale: (x: number, y: number) => void;
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  arcTo: (x1: number, y1: number, x2: number, y2: number, radius: number) => void;
  closePath: () => void;
  fill: () => void;
  stroke: () => void;
  fillText: (text: string, x: number, y: number) => void;
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  globalAlpha: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetY: number;
  /**
   * Canvas letter-spacing, which the design system's label style needs and which older WebViews
   * do not have. Optional so a context without it still paints — untracked type is a wrong
   * detail, a thrown exception is a missing card.
   */
  letterSpacing?: string;
};

/**
 * A rounded rectangle via `arcTo`, not `ctx.roundRect`.
 *
 * `roundRect` is Chrome 99+; this app ships inside whatever System WebView the phone happens to
 * carry, and a missing method there would throw mid-paint rather than degrade. `arcTo` has been
 * in every canvas implementation since the beginning.
 */
const roundedPath = (
  ctx: ShareContext,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void => {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const clearShadow = (ctx: ShareContext): void => {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
};

const paintOp = (ctx: ShareContext, op: ShareOp): void => {
  ctx.globalAlpha = ("alpha" in op ? op.alpha : undefined) ?? 1;

  if (op.op === "rect") {
    roundedPath(ctx, op.x, op.y, op.w, op.h, op.radius);

    if (op.shadow !== undefined) {
      ctx.shadowColor = op.shadow.color;
      ctx.shadowBlur = op.shadow.blur;
      ctx.shadowOffsetY = op.shadow.offsetY;
    }

    if (op.fill !== undefined) {
      ctx.fillStyle = op.fill;
      ctx.fill();
    }

    // Cleared before the stroke so an outline never picks up the fill's elevation.
    clearShadow(ctx);

    if (op.stroke !== undefined) {
      ctx.strokeStyle = op.stroke;
      ctx.lineWidth = op.lineWidth ?? 1;
      ctx.stroke();
    }
    return;
  }

  if (op.op === "line") {
    ctx.strokeStyle = op.color;
    ctx.lineWidth = op.width;
    ctx.beginPath();
    ctx.moveTo(op.x, op.y);
    ctx.lineTo(op.x + op.w, op.y);
    ctx.stroke();
    return;
  }

  ctx.font = op.font;
  ctx.fillStyle = op.color;
  ctx.textAlign = op.align;
  // Every y in the layout is a text baseline, so the context must agree.
  ctx.textBaseline = "alphabetic";
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${String(op.tracking ?? 0)}px`;
  ctx.fillText(op.text, op.x, op.y);
};

/** Paints the layout at `scale` device pixels per logical pixel. */
export const paintShareImage = (
  ctx: ShareContext,
  layout: ShareImageLayout,
  scale: number,
): void => {
  ctx.save();
  ctx.scale(scale, scale);
  clearShadow(ctx);
  for (const op of layout.ops) paintOp(ctx, op);
  ctx.globalAlpha = 1;
  ctx.restore();
};
