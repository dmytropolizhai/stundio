/**
 * The share layer's public surface: build a week card, paint it, hand it to the OS.
 *
 * Domain-free by design — the caller resolves subject accents, translations and dates, so this
 * layer never reaches up into `ui/` or into EduPage's vocabulary (CLAUDE.md).
 */
export type { ShareCell, ShareColumn, ShareImageData, SharePalette, ShareRow } from "./types.ts";
export { clip, layoutShareImage, type ShareImageLayout, type ShareOp } from "./layout.ts";
export { paintShareImage, type ShareContext } from "./paint.ts";
export {
  dataUrlToBase64,
  renderShareImage,
  type CreateCanvas,
  type RenderedImage,
  type RenderOptions,
  type ShareCanvas,
} from "./render.ts";
export {
  base64ToBlob,
  browserShareEnvironment,
  shareImage,
  type NativeSharePayload,
  type ShareCapableNavigator,
  type ShareEnvironment,
  type ShareOutcome,
} from "./share.ts";
