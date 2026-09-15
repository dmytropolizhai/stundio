/**
 * Canvas card generator and share text for the iPhone release announcement.
 *
 * Like `weekImage.ts`, this renders entirely on-device via `<canvas>` without external network calls
 * or heavy libraries. It produces a crisp, branded announcement image with a scannable QR code
 * and 3-step installation tutorial.
 */
import { encodeQr, type QrMatrix } from "@/lib/share/qr.ts";
import type { Translate } from "@/ui/i18n";

export const IPHONE_PWA_URL = "https://stundio.pages.dev";

export type RenderIphoneShareOptions = {
  t: Translate;
  scale?: number;
  createCanvas?: (width: number, height: number) => {
    width: number;
    height: number;
    getContext: (id: "2d") => CanvasRenderingContext2D | null;
    toDataURL: (type?: string) => string;
  };
};

export type RenderedIphoneImage = {
  dataUrl: string;
  width: number;
  height: number;
};

const defaultCreateCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill?: string,
  stroke?: string,
  lineWidth = 1,
) => {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();

  if (fill !== undefined) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke !== undefined) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
};

const drawQr = (
  ctx: CanvasRenderingContext2D,
  qr: QrMatrix,
  x: number,
  y: number,
  moduleSize: number,
  quietModules = 3,
) => {
  const quiet = quietModules * moduleSize;
  const plateSize = (qr.length + quietModules * 2) * moduleSize;

  drawRoundedRect(ctx, x, y, plateSize, plateSize, 12, "#ffffff");

  ctx.fillStyle = "#0b0c10";
  for (let r = 0; r < qr.length; r += 1) {
    const row = qr[r];
    if (row === undefined) continue;
    for (let c = 0; c < row.length; c += 1) {
      if (row[c]) {
        ctx.fillRect(x + quiet + c * moduleSize, y + quiet + r * moduleSize, moduleSize, moduleSize);
      }
    }
  }
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
): number => {
  const words = text.split(" ");
  let currentLine = "";
  let y = startY;

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (word === undefined) continue;
    const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      ctx.fillText(currentLine, x, y);
      currentLine = word;
      y += lineHeight;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.length > 0) {
    ctx.fillText(currentLine, x, y);
    y += lineHeight;
  }
  return y;
};

export const renderIphoneShareImage = ({
  t,
  scale = 2,
  createCanvas = defaultCreateCanvas,
}: RenderIphoneShareOptions): RenderedIphoneImage => {
  const W = 640;
  const H = 840;

  const canvas = createCanvas(W * scale, H * scale);
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("Canvas 2D context is unavailable");
  }

  ctx.scale(scale, scale);

  // 1. Background
  ctx.fillStyle = "#0c0d0e";
  ctx.fillRect(0, 0, W, H);

  // Outer container border
  drawRoundedRect(ctx, 20, 20, W - 40, H - 40, 28, "#101215", "#24282e", 1.5);

  const padX = 48;
  const contentW = W - padX * 2;
  let cursorY = 56;

  // 2. Brand & Announcement Tag
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("STUNDIO", padX, cursorY + 14);

  const badgeText = t("iphoneAnnouncement.badge");
  ctx.font = '700 11px "Manrope", sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + 18;
  drawRoundedRect(ctx, W - padX - badgeWidth, cursorY, badgeWidth, 24, 12, "#0284c7");
  ctx.fillStyle = "#ffffff";
  ctx.fillText(badgeText, W - padX - badgeWidth + 9, cursorY + 16);

  cursorY += 46;

  // 3. Headline
  ctx.font = '800 28px "Manrope", sans-serif';
  ctx.fillStyle = "#ffffff";
  cursorY = wrapText(ctx, t("iphoneAnnouncement.headline"), padX, cursorY + 16, contentW, 34);

  // Subtitle
  ctx.font = '400 15px "Manrope", sans-serif';
  ctx.fillStyle = "#94a3b8";
  cursorY = wrapText(ctx, t("iphoneAnnouncement.subtitle"), padX, cursorY + 8, contentW, 22);

  cursorY += 12;

  // 4. Three Steps
  const steps = [
    {
      num: "1",
      title: t("iphoneAnnouncement.step1.title"),
      desc: t("iphoneAnnouncement.step1.desc"),
    },
    {
      num: "2",
      title: t("iphoneAnnouncement.step2.title"),
      desc: t("iphoneAnnouncement.step2.desc"),
    },
    {
      num: "3",
      title: t("iphoneAnnouncement.step3.title"),
      desc: t("iphoneAnnouncement.step3.desc"),
    },
  ];

  const stepCardH = 76;
  const stepGap = 12;

  for (const step of steps) {
    drawRoundedRect(ctx, padX, cursorY, contentW, stepCardH, 18, "#181a1f", "#262b32", 1);

    // Step circle
    drawRoundedRect(ctx, padX + 16, cursorY + 18, 40, 40, 20, "#0284c7");
    ctx.font = '800 18px "Manrope", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(step.num, padX + 16 + 20, cursorY + 18 + 20);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // Step text
    ctx.font = '700 15px "Manrope", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(step.title, padX + 68, cursorY + 34);

    ctx.font = '400 13px "Manrope", sans-serif';
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(step.desc, padX + 68, cursorY + 54);

    cursorY += stepCardH + stepGap;
  }

  cursorY += 14;

  // 5. Footer with QR Code and Link
  let qrMatrix: QrMatrix | null = null;
  try {
    qrMatrix = encodeQr(IPHONE_PWA_URL);
  } catch {
    qrMatrix = null;
  }

  const footerH = 140;
  drawRoundedRect(ctx, padX, cursorY, contentW, footerH, 20, "#13161a", "#22262d", 1);

  if (qrMatrix !== null) {
    const qrModuleSize = 3;
    const qrPlateSize = (qrMatrix.length + 6) * qrModuleSize;
    drawQr(ctx, qrMatrix, padX + 16, cursorY + (footerH - qrPlateSize) / 2, qrModuleSize, 3);

    const infoX = padX + 16 + qrPlateSize + 20;
    const infoW = contentW - (16 + qrPlateSize + 20) - 16;

    ctx.font = '700 13px "Manrope", sans-serif';
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(t("iphoneAnnouncement.title"), infoX, cursorY + 42);

    ctx.font = '800 21px "JetBrains Mono", monospace';
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("stundio.pages.dev", infoX, cursorY + 72);

    ctx.font = '400 12px "Manrope", sans-serif';
    ctx.fillStyle = "#64748b";
    wrapText(ctx, t("iphoneAnnouncement.step1.desc"), infoX, cursorY + 98, infoW, 16);
  } else {
    ctx.font = '800 22px "JetBrains Mono", monospace';
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("stundio.pages.dev", padX + 24, cursorY + 74);
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: W * scale,
    height: H * scale,
  };
};

/** Formats the accompanying message text for sharing */
export const iphoneShareText = (t: Translate): string =>
  `${t("iphoneAnnouncement.shareMessage")}\n`;
