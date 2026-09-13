/**
 * The week card's geometry — a pure function from data to a flat display list.
 *
 * Kept separate from the painting so the card can be reasoned about (and tested) without a
 * canvas: `layoutShareImage` decides *what sits where*, `paint.ts` only replays the result.
 * All numbers are logical CSS pixels; the renderer scales them for the exported bitmap.
 */
import type { ShareCell, ShareImageData, SharePalette } from "./types.ts";

export type ShareOp =
  | {
      op: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      radius: number;
      fill?: string;
      stroke?: string;
      lineWidth?: number;
      alpha?: number;
    }
  | {
      op: "text";
      x: number;
      y: number;
      text: string;
      font: string;
      color: string;
      align: "left" | "center" | "right";
      alpha?: number;
    }
  /** Always horizontal: hairline rules and the strike through a cancelled lesson. */
  | { op: "line"; x: number; y: number; w: number; color: string; width: number };

export type ShareImageLayout = { width: number; height: number; ops: ShareOp[] };

/* The two bundled families (`ds/tokens/fonts.css`); the fallbacks are what a browser
 * without them — a desktop dev build — lands on. */
const DISPLAY = '"Manrope", system-ui, -apple-system, sans-serif';
const DATA = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

const WIDTH = 720;
const PAD = 44;
const CONTENT = WIDTH - PAD * 2;

const COL_GAP = 8;
const TIME_COL = 78;
const HEAD_ROW = 50;
const ROW_H = 64;
const ROW_GAP = 8;
const CELL_RADIUS = 12;

/**
 * Character-budget truncation rather than `measureText`.
 *
 * Text metrics depend on which faces the WebView actually resolved, so a measured layout can
 * differ between the emulator and a phone that failed to load Manrope. A budget cannot: the card
 * is laid out identically everywhere, and the one string long enough to need this (a room list)
 * is monospaced anyway.
 */
export const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;

/** Roughly how many characters fit across a cell at the given font size. */
const budget = (width: number, fontSize: number): number =>
  Math.max(1, Math.floor(width / (fontSize * 0.62)));

const cellOps = (
  cell: ShareCell,
  x: number,
  y: number,
  w: number,
  palette: SharePalette,
): ShareOp[] => {
  const alpha = cell.cancelled === true ? 0.45 : undefined;
  const ops: ShareOp[] = [
    {
      op: "rect",
      x,
      y,
      w,
      h: ROW_H,
      radius: CELL_RADIUS,
      fill: cell.fill,
      ...(cell.outlined === true ? { stroke: palette.strongBorder, lineWidth: 3 } : {}),
      ...(alpha === undefined ? {} : { alpha }),
    },
  ];

  const detail = cell.detail === undefined ? "" : cell.detail.trim();
  const centre = x + w / 2;
  const labelY = detail === "" ? y + ROW_H / 2 + 8 : y + ROW_H / 2 - 2;
  const label = clip(cell.label, budget(w - 12, 22));

  ops.push({
    op: "text",
    x: centre,
    y: labelY,
    text: label,
    font: `800 22px ${DISPLAY}`,
    color: cell.ink,
    align: "center",
    ...(alpha === undefined ? {} : { alpha }),
  });

  if (detail !== "") {
    ops.push({
      op: "text",
      x: centre,
      y: y + ROW_H / 2 + 18,
      text: clip(detail, budget(w - 10, 13)),
      font: `500 13px ${DATA}`,
      color: cell.ink,
      align: "center",
      alpha: (alpha ?? 1) * 0.8,
    });
  }

  if (cell.cancelled === true) {
    // The week grid strikes a cancelled lesson through; a colour change alone would be the one
    // thing a screenshot cannot explain later.
    const strike = Math.min(w - 20, label.length * 13 + 8);
    ops.push({
      op: "line",
      x: centre - strike / 2,
      y: labelY - 7,
      w: strike,
      color: cell.ink,
      width: 2,
    });
  }

  return ops;
};

/**
 * Lays the whole card out top to bottom. Height follows the content: a five-period week is a
 * shorter image than a nine-period one, never a tall card with dead space under the grid.
 */
export const layoutShareImage = (data: ShareImageData, palette: SharePalette): ShareImageLayout => {
  const ops: ShareOp[] = [];
  const columns = data.columns.length;
  const colW = columns === 0 ? CONTENT : (CONTENT - TIME_COL - COL_GAP * columns) / columns;
  const colX = (i: number): number => PAD + TIME_COL + COL_GAP + i * (colW + COL_GAP);

  /* ---------- header ---------- */
  const eyebrowY = PAD + 14;
  const classY = eyebrowY + 50;
  const teacherY = classY + 28;

  ops.push(
    {
      op: "text",
      x: PAD,
      y: eyebrowY,
      text: data.eyebrow.toUpperCase(),
      font: `700 13px ${DISPLAY}`,
      color: palette.muted,
      align: "left",
    },
    {
      op: "text",
      x: PAD,
      y: classY,
      text: clip(data.className, 14),
      font: `800 44px ${DISPLAY}`,
      color: palette.strong,
      align: "left",
    },
    {
      op: "text",
      x: WIDTH - PAD,
      y: classY,
      text: data.period,
      font: `700 26px ${DATA}`,
      color: palette.strong,
      align: "right",
    },
  );

  if (data.classTeacher !== null) {
    ops.push({
      op: "text",
      x: PAD,
      y: teacherY,
      text: `${data.classTeacher.label}: ${clip(data.classTeacher.name, 34)}`,
      font: `500 16px ${DISPLAY}`,
      color: palette.muted,
      align: "left",
    });
  }

  const headerBottom = (data.classTeacher === null ? classY + 12 : teacherY) + 22;
  ops.push({ op: "line", x: PAD, y: headerBottom, w: CONTENT, color: palette.hairline, width: 1 });

  /* ---------- grid ---------- */
  const gridTop = headerBottom + 26;

  data.columns.forEach((column, i) => {
    const centre = colX(i) + colW / 2;
    ops.push(
      {
        op: "text",
        x: centre,
        y: gridTop + 16,
        text: column.weekday.toUpperCase(),
        font: `700 14px ${DISPLAY}`,
        color: palette.strong,
        align: "center",
      },
      {
        op: "text",
        x: centre,
        y: gridTop + 36,
        text: column.date,
        font: `500 13px ${DATA}`,
        color: palette.muted,
        align: "center",
      },
    );
  });

  const rowY = (i: number): number => gridTop + HEAD_ROW + i * (ROW_H + ROW_GAP);

  data.rows.forEach((row, rowIndex) => {
    const y = rowY(rowIndex);

    ops.push(
      {
        op: "text",
        x: PAD,
        y: y + 18,
        text: row.period,
        font: `700 12px ${DISPLAY}`,
        color: palette.muted,
        align: "left",
      },
      {
        op: "text",
        x: PAD,
        y: y + 38,
        text: row.start,
        font: `500 16px ${DATA}`,
        color: palette.text,
        align: "left",
      },
      // The end time is the half of the pair the app's own week grid leaves out — on a shared
      // card there is no lesson to tap for it, so it is drawn. The dash is what stops the pair
      // from reading as two separate start times.
      {
        op: "text",
        x: PAD,
        y: y + 56,
        text: `–${row.end}`,
        font: `500 14px ${DATA}`,
        color: palette.muted,
        align: "left",
      },
    );

    for (let i = 0; i < columns; i += 1) {
      const x = colX(i);
      const cell = row.cells[i] ?? null;

      if (cell === null) {
        // Hairline as well as fill, for the same reason the week grid carries one: in dark mode
        // the sunken surface sits a few levels off the card and an unbordered free slot would
        // dissolve into it.
        ops.push({
          op: "rect",
          x,
          y,
          w: colW,
          h: ROW_H,
          radius: CELL_RADIUS,
          fill: palette.sunken,
          stroke: palette.hairline,
          lineWidth: 1,
        });
        continue;
      }

      ops.push(...cellOps(cell, x, y, colW, palette));
    }
  });

  const gridBottom =
    data.rows.length === 0 ? gridTop + HEAD_ROW : rowY(data.rows.length - 1) + ROW_H;

  /* ---------- notes + footer ---------- */
  let y = gridBottom + 30;

  data.notes.forEach((note, i) => {
    ops.push({
      op: "text",
      x: PAD,
      y: y + 14 + i * 24,
      text: clip(note, 62),
      font: `500 15px ${DISPLAY}`,
      color: palette.text,
      align: "left",
    });
  });

  if (data.notes.length > 0) y += data.notes.length * 24 + 12;

  ops.push({ op: "line", x: PAD, y, w: CONTENT, color: palette.hairline, width: 1 });

  const brandY = y + 34;
  ops.push(
    {
      op: "text",
      x: PAD,
      y: brandY,
      text: data.brand,
      font: `800 24px ${DISPLAY}`,
      color: palette.strong,
      align: "left",
    },
    {
      op: "text",
      x: WIDTH - PAD,
      y: brandY - 2,
      text: data.link,
      font: `500 13px ${DATA}`,
      color: palette.muted,
      align: "right",
    },
  );

  const height = brandY + PAD;

  return {
    width: WIDTH,
    height,
    // The ground goes in first: every op above is painted over it.
    ops: [
      { op: "rect", x: 0, y: 0, w: WIDTH, h: height, radius: 0, fill: palette.background },
      {
        op: "rect",
        x: PAD / 2,
        y: PAD / 2,
        w: WIDTH - PAD,
        h: height - PAD,
        radius: 24,
        fill: palette.surface,
      },
      ...ops,
    ],
  };
};
