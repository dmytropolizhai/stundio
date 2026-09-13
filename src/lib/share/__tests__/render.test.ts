/**
 * Rendering, with the canvas injected — the export has to hold together without a browser
 * surface, and the two things worth pinning down are the device-pixel scaling and what happens
 * when a WebView refuses a 2D context.
 */
import { describe, expect, it, vi } from "vitest";
import {
  dataUrlToBase64,
  renderShareImage,
  type CreateCanvas,
  type ShareCanvas,
} from "../render.ts";
import type { ShareContext } from "../paint.ts";
import type { ShareImageData, SharePalette } from "../types.ts";

const palette: SharePalette = {
  background: "#f6f7fa",
  surface: "#ffffff",
  sunken: "#edeff4",
  hairline: "#dde1ea",
  strongBorder: "#b9bfce",
  text: "#2a2d36",
  strong: "#0b0c10",
  muted: "#5b6070",
  shadow: "rgba(6, 11, 61, 0.16)",
};

const data: ShareImageData = {
  className: "A1-2",
  period: "07.09.–11.09.",
  classTeacher: null,
  columns: [{ weekday: "Pr", date: "7.09." }],
  rows: [
    {
      period: "1",
      start: "08:30",
      end: "09:10",
      cells: [{ label: "PRG", fill: "#9cc8f7", ink: "#0c3560" }],
    },
  ],
  legend: [],
  notes: [],
  brand: "Stundio",
  link: { label: "shorturl.at/pPrzh", qr: null },
};

const stubContext = (): ShareContext =>
  ({
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
    globalAlpha: 1,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0,
  }) satisfies ShareContext;

const fakeCanvas = (
  context: ShareContext | null,
): { create: CreateCanvas; canvas: ShareCanvas } => {
  const canvas: ShareCanvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toDataURL: () => "data:image/png;base64,QUJD",
  };
  return {
    canvas,
    create: (width, height) => {
      canvas.width = width;
      canvas.height = height;
      return canvas;
    },
  };
};

describe("renderShareImage", () => {
  it("sizes the bitmap in device pixels and draws at that scale", () => {
    const ctx = stubContext();
    const { create, canvas } = fakeCanvas(ctx);

    const image = renderShareImage(data, { palette, scale: 3, createCanvas: create });

    expect(canvas.width).toBe(image.width);
    expect(image.width).toBe(560 * 3);
    expect(ctx.scale).toHaveBeenCalledWith(3, 3);
    expect(image.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("defaults to 2× — a phone screenshot of a shared card should not be soft", () => {
    const { create } = fakeCanvas(stubContext());
    expect(renderShareImage(data, { palette, createCanvas: create }).width).toBe(1120);
  });

  it("says so when the platform hands back no 2D context", () => {
    const { create } = fakeCanvas(null);
    expect(() => renderShareImage(data, { palette, createCanvas: create })).toThrow(/Canvas 2D/);
  });
});

describe("dataUrlToBase64", () => {
  it("drops the data URL preamble the native bridge does not want", () => {
    expect(dataUrlToBase64("data:image/png;base64,QUJD")).toBe("QUJD");
  });
});
