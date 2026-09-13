/**
 * Layout + paint → a PNG data URL, produced entirely on the device.
 *
 * There is no backend to render this (CLAUDE.md), and no DOM-to-image library either: the card
 * is drawn with plain canvas calls, so the export costs nothing at runtime, works offline, and
 * cannot be broken by a CSS feature the WebView's screenshotter does not understand.
 */
import { layoutShareImage } from "./layout.ts";
import { paintShareImage, type ShareContext } from "./paint.ts";
import type { ShareImageData, SharePalette } from "./types.ts";

export type ShareCanvas = {
  width: number;
  height: number;
  getContext: (contextId: "2d") => ShareContext | null;
  toDataURL: (type?: string) => string;
};

export type CreateCanvas = (width: number, height: number) => ShareCanvas;

export type RenderOptions = {
  palette: SharePalette;
  /** Device pixels per logical pixel. 2 puts the card at 1440px wide — messenger-safe. */
  scale?: number;
  createCanvas?: CreateCanvas;
};

export type RenderedImage = { dataUrl: string; width: number; height: number };

const domCanvas: CreateCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const renderShareImage = (
  data: ShareImageData,
  { palette, scale = 2, createCanvas = domCanvas }: RenderOptions,
): RenderedImage => {
  const layout = layoutShareImage(data, palette);
  const width = Math.round(layout.width * scale);
  const height = Math.round(layout.height * scale);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D is unavailable");

  paintShareImage(ctx, layout, scale);

  return { dataUrl: canvas.toDataURL("image/png"), width, height };
};

/** `data:image/png;base64,AAAA` → `AAAA`, which is what the native share plugin takes. */
export const dataUrlToBase64 = (dataUrl: string): string => dataUrl.slice(dataUrl.indexOf(",") + 1);
