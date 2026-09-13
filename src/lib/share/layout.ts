/**
 * The week card's geometry — a pure function from data to a flat display list.
 *
 * Kept separate from the painting so the card can be reasoned about (and tested) without a
 * canvas: `layoutShareImage` decides *what sits where*, `paint.ts` only replays the result.
 *
 * Every number below is a design-system value, not a guess: the 4px spacing base and its larger
 * steps, the radius scale (28 for the card, 12 for a lesson cell), and the type scale with its
 * tracking (DESIGN.md). The card is a Studio surface that happens to be exported as a bitmap
 * rather than rendered in the WebView, and it has to look like one next to a screenshot of the
 * app. Units are logical pixels; the renderer scales them for the exported image.
 */
import type { QrMatrix } from "./qr.ts";
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
      /** Navy-tinted drop shadow, the system's one elevation idiom. */
      shadow?: { color: string; blur: number; offsetY: number };
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
      /** Letter-spacing in pixels — the label style's 0.14em, resolved. */
      tracking?: number;
    }
  /** Always horizontal: hairline rules and the strike through a cancelled lesson. */
  | { op: "line"; x: number; y: number; w: number; color: string; width: number };

export type ShareImageLayout = { width: number; height: number; ops: ShareOp[] };

/* The two bundled families (`ds/tokens/fonts.css`); the fallbacks are what a browser without
 * them — a desktop dev build — lands on. */
const DISPLAY = '"Manrope", system-ui, -apple-system, sans-serif';
const DATA = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

/* The type scale, verbatim from DESIGN.md. */
const HERO = `800 56px ${DISPLAY}`;
const DISPLAY_2 = `700 30px ${DISPLAY}`;
const BODY_STRONG = `700 15px ${DISPLAY}`;
const CAPTION = `500 13px ${DISPLAY}`;
const LABEL = `700 11px ${DISPLAY}`;
const LABEL_TRACKING = 11 * 0.14;
const DATA_15 = `500 15px ${DATA}`;
const DATA_13 = `500 13px ${DATA}`;
const DATA_11 = `500 11px ${DATA}`;

/*
 * A wider artboard than the app's 420px phone width: this is read as an image, often beside a
 * chat bubble, and a week of subject codes plus room numbers needs the columns. The type,
 * spacing and radius scales are the phone's, unchanged — only the canvas is wider.
 */
const WIDTH = 560;
const CARD_INSET = 16;
const CARD_RADIUS = 28; // --radius-xl, the design system's standard card
const CARD_PAD = 24;

const CONTENT_X = CARD_INSET + CARD_PAD;
const CONTENT_W = WIDTH - CONTENT_X * 2;

const TIME_COL = 52;
const COL_GAP = 6;
const HEAD_ROW = 44;
const ROW_H = 48;
const ROW_GAP = 6;
const CELL_RADIUS = 12; // --radius-sm, as the week grid uses

const NOTE_H = 28;
const NOTE_PAD = 12;
const NOTE_GAP = 8;

/* The key under the grid: an accent swatch carrying the code, then the name it stands for. */
const KEY_SWATCH_W = 46;
const KEY_SWATCH_H = 20;
const KEY_TEXT_X = KEY_SWATCH_W + 10;
const KEY_LINE_H = 17;
const KEY_ROW_GAP = 7;

/**
 * Module size for the QR block, in logical pixels.
 *
 * Sized from what actually scans, not from what looks tidy: a shared image is read at phone
 * width, and at 4px a detector already loses the code in the full frame while 5px finds it every
 * time. The block lands at just under a third of the card's width — deliberately a real element
 * rather than a stamp in the corner.
 */
const QR_MODULE = 5;
/** The light margin the format requires around a symbol for a scanner to find it. */
const QR_QUIET = 4;

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

/** Roughly how many characters fit across a box at the given font size. */
const budget = (width: number, fontSize: number): number =>
  Math.max(1, Math.floor(width / (fontSize * 0.62)));

/**
 * Greedy word wrap to at most `maxLines`, ellipsising whatever will not fit.
 *
 * Same reasoning as `clip`: a character budget, not measured text, so the card lays out
 * identically wherever it is drawn. Two lines at the key's width covers every subject name RVT
 * publishes, including the 92-character ones.
 */
export const wrap = (text: string, perLine: number, maxLines: number): string[] => {
  const words = text.split(/\s+/).filter((word) => word !== "");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line === "" ? word : `${line} ${word}`;

    if (candidate.length <= perLine) {
      line = candidate;
      continue;
    }

    if (lines.length + 1 === maxLines) {
      lines.push(clip(candidate, perLine));
      return lines;
    }

    if (line !== "") lines.push(line);
    line = clip(word, perLine);
  }

  if (line !== "") lines.push(line);
  return lines;
};

const columnWidth = (columns: number): number =>
  columns === 0 ? CONTENT_W : (CONTENT_W - TIME_COL - COL_GAP * columns) / columns;

const cellOps = (
  cell: ShareCell,
  x: number,
  y: number,
  w: number,
  palette: SharePalette,
): ShareOp[] => {
  /*
   * Cancelled: faded and struck through, kept exactly where it was. The lesson card's 55% rather
   * than the week grid's 40% — a pastel fill at 40% over a dark card turns to mud and takes its
   * ink with it, and this surface has to hold up in both themes with no tap to clarify it.
   */
  const alpha = cell.cancelled === true ? 0.55 : undefined;
  const detail = (cell.detail ?? "").trim();
  const centre = x + w / 2;
  const label = clip(cell.label, budget(w - 12, 13));

  const ops: ShareOp[] = [
    {
      op: "rect",
      x,
      y,
      w,
      h: ROW_H,
      radius: CELL_RADIUS,
      fill: cell.fill,
      // A tinted surface never carries a shadow (DESIGN.md); the ring is the building marker,
      // exactly as the week grid draws it.
      ...(cell.outlined === true ? { stroke: palette.strongBorder, lineWidth: 2 } : {}),
      ...(alpha === undefined ? {} : { alpha }),
    },
    {
      op: "text",
      x: centre,
      y: detail === "" ? y + ROW_H / 2 + 5 : y + 21,
      text: label,
      font: `700 13px ${DISPLAY}`,
      color: cell.ink,
      align: "center",
      ...(alpha === undefined ? {} : { alpha }),
    },
  ];

  if (detail !== "") {
    ops.push({
      op: "text",
      x: centre,
      y: y + 37,
      // Nearly the full cell width: the detail is centred and monospaced, and RVT's room codes
      // ("341 D(30) P") land exactly on the boundary where a tighter budget costs a character.
      text: clip(detail, budget(w - 4, 11)),
      font: DATA_11,
      color: cell.ink,
      align: "center",
      // The ink pair at reduced strength: still the subject's own colour, still past 4.5:1.
      alpha: (alpha ?? 1) * 0.85,
    });
  }

  if (cell.cancelled === true) {
    const strike = Math.min(w - 16, label.length * 9 + 6);
    ops.push({
      op: "line",
      x: centre - strike / 2,
      y: (detail === "" ? y + ROW_H / 2 + 5 : y + 21) - 4,
      w: strike,
      color: cell.ink,
      width: 1.5,
    });
  }

  return ops;
};

/** The QR block: a light plate, its quiet zone, and one rect per dark module. */
const qrOps = (qr: QrMatrix, x: number, y: number): ShareOp[] => {
  const plate = (qr.length + QR_QUIET * 2) * QR_MODULE;

  const ops: ShareOp[] = [
    // White plate and near-black modules in *both* themes — the one place this card ignores the
    // theme on purpose. A scanner needs dark-on-light; a code inverted for dark mode is a code
    // half the readers' cameras refuse.
    {
      op: "rect",
      x,
      y,
      w: plate,
      h: plate,
      radius: CELL_RADIUS,
      fill: "#ffffff",
    },
  ];

  const origin = QR_QUIET * QR_MODULE;

  qr.forEach((row, r) => {
    row.forEach((dark, c) => {
      if (!dark) return;
      ops.push({
        op: "rect",
        x: x + origin + c * QR_MODULE,
        y: y + origin + r * QR_MODULE,
        w: QR_MODULE,
        h: QR_MODULE,
        radius: 0,
        fill: "#0b0c10",
      });
    });
  });

  return ops;
};

/**
 * Lays the whole card out top to bottom. Height follows the content: a five-period week is a
 * shorter image than a nine-period one, never a tall card with dead space under the grid.
 */
export const layoutShareImage = (data: ShareImageData, palette: SharePalette): ShareImageLayout => {
  const ops: ShareOp[] = [];
  const columns = data.columns.length;
  const colW = columnWidth(columns);
  const colX = (i: number): number => CONTENT_X + TIME_COL + COL_GAP + i * (colW + COL_GAP);

  /* ---------- header ---------- */

  // Set BIG and tight, and given the room to be: the class is what the reader is looking for.
  const classY = CARD_INSET + CARD_PAD + 44;

  ops.push(
    {
      op: "text",
      x: CONTENT_X,
      y: classY,
      text: clip(data.className, 12),
      font: HERO,
      color: palette.strong,
      align: "left",
      tracking: -56 * 0.035,
    },
    {
      op: "text",
      x: CONTENT_X,
      y: classY + 28,
      text: data.period,
      font: DATA_15,
      color: palette.text,
      align: "left",
    },
  );

  let y = classY + 28;

  if (data.classTeacher !== null) {
    y += 22;
    ops.push({
      op: "text",
      x: CONTENT_X,
      y,
      text: `${data.classTeacher.label}: ${clip(data.classTeacher.name, 36)}`,
      font: CAPTION,
      color: palette.muted,
      align: "left",
    });
  }

  y += 24;
  ops.push({ op: "line", x: CONTENT_X, y, w: CONTENT_W, color: palette.hairline, width: 1 });

  /* ---------- grid ---------- */

  const gridTop = y + 26;

  data.columns.forEach((column, i) => {
    const centre = colX(i) + colW / 2;
    ops.push(
      {
        op: "text",
        x: centre,
        y: gridTop + 14,
        // Uppercase lives at label size and nowhere else in this system.
        text: column.weekday.toUpperCase(),
        font: LABEL,
        color: palette.strong,
        align: "center",
        tracking: LABEL_TRACKING,
      },
      {
        op: "text",
        x: centre,
        y: gridTop + 30,
        text: column.date,
        font: DATA_11,
        color: palette.muted,
        align: "center",
      },
    );
  });

  const rowsTop = gridTop + HEAD_ROW;
  const rowY = (i: number): number => rowsTop + i * (ROW_H + ROW_GAP);

  data.rows.forEach((row, rowIndex) => {
    const top = rowY(rowIndex);

    ops.push(
      {
        op: "text",
        x: CONTENT_X,
        y: top + 21,
        text: row.start,
        font: DATA_13,
        color: palette.text,
        align: "left",
      },
      // The end time is the half of the pair the app's own week grid leaves out — on a shared
      // card there is no lesson to tap for it, so it is drawn. The dash is what stops the pair
      // from reading as two separate start times.
      {
        op: "text",
        x: CONTENT_X,
        y: top + 37,
        text: `–${row.end}`,
        font: DATA_11,
        color: palette.muted,
        align: "left",
      },
    );

    for (let i = 0; i < columns; i += 1) {
      const cell = row.cells[i] ?? null;

      if (cell === null) {
        // Fill plus hairline, for the same reason the week grid carries one: in dark mode the
        // sunken surface sits a few levels off the card and an unbordered free slot would
        // dissolve into it.
        ops.push({
          op: "rect",
          x: colX(i),
          y: top,
          w: colW,
          h: ROW_H,
          radius: CELL_RADIUS,
          fill: palette.sunken,
          stroke: palette.hairline,
          lineWidth: 1,
        });
        continue;
      }

      ops.push(...cellOps(cell, colX(i), top, colW, palette));
    }
  });

  y = data.rows.length === 0 ? gridTop + HEAD_ROW : rowY(data.rows.length - 1) + ROW_H;

  /* ---------- the key to the codes ---------- */

  /*
   * The grid abbreviates because a cell is 80pt wide; RVT's subject names run to 92 characters
   * ("Ritošā sastāva enerģētisko iekārtu un palīgiekārtu tehniskās apkopes un remonta veikšana
   * PB4"), so no arrangement of five columns holds them. The key is where the card pays that
   * back in full — every code the week uses, spelled out, with its accent alongside so the
   * colour is a second way in.
   */
  if (data.legend.length > 0) {
    y += 26;

    const nameWidth = CONTENT_W - KEY_TEXT_X;

    for (const entry of data.legend) {
      const lines = wrap(entry.name, budget(nameWidth, 13), 2);

      ops.push(
        {
          op: "rect",
          x: CONTENT_X,
          y,
          w: KEY_SWATCH_W,
          h: KEY_SWATCH_H,
          radius: KEY_SWATCH_H / 2,
          fill: entry.fill,
        },
        {
          op: "text",
          x: CONTENT_X + KEY_SWATCH_W / 2,
          y: y + 14,
          text: clip(entry.label, 6),
          font: LABEL,
          color: entry.ink,
          align: "center",
          tracking: LABEL_TRACKING,
        },
      );

      lines.forEach((line, i) => {
        ops.push({
          op: "text",
          x: CONTENT_X + KEY_TEXT_X,
          y: y + 14 + i * KEY_LINE_H,
          text: line,
          font: CAPTION,
          color: palette.text,
          align: "left",
        });
      });

      y += Math.max(KEY_SWATCH_H, lines.length * KEY_LINE_H) + KEY_ROW_GAP;
    }

    y -= KEY_ROW_GAP;
  }

  /* ---------- building notes ---------- */

  if (data.notes.length > 0) {
    y += 20;
    let noteX = CONTENT_X;

    for (const note of data.notes) {
      const text = clip(note, 40);
      // Caption-sized Manrope averages a shade over 6px a character; the pill hugs that rather
      // than trailing dead space on the longer of two notes.
      const width = Math.min(text.length * 6.4 + NOTE_PAD * 2, CONTENT_W);

      if (noteX + width > CONTENT_X + CONTENT_W && noteX > CONTENT_X) {
        noteX = CONTENT_X;
        y += NOTE_H + NOTE_GAP;
      }

      ops.push(
        {
          op: "rect",
          x: noteX,
          y,
          w: width,
          h: NOTE_H,
          radius: NOTE_H / 2, // a pill: anything that could be pressed in the app is one
          fill: palette.sunken,
        },
        {
          op: "text",
          x: noteX + NOTE_PAD,
          y: y + 18,
          text,
          font: CAPTION,
          color: palette.text,
          align: "left",
        },
      );

      noteX += width + NOTE_GAP;
    }

    y += NOTE_H;
  }

  /* ---------- footer: the signature and the way in ---------- */

  y += 24;
  ops.push({ op: "line", x: CONTENT_X, y, w: CONTENT_W, color: palette.hairline, width: 1 });

  const footerTop = y + 24;
  const qr = data.link.qr;
  const qrPlate = qr === null ? 0 : (qr.length + QR_QUIET * 2) * QR_MODULE;
  const footerH = Math.max(qrPlate, 52);

  if (qr !== null) {
    ops.push(...qrOps(qr, CONTENT_X + CONTENT_W - qrPlate, footerTop));
  }

  // The wordmark and the typed route, centred against the code: whoever is reading this on the
  // very phone that would scan it still has somewhere to go.
  const textMiddle = footerTop + footerH / 2;

  ops.push(
    {
      op: "text",
      x: CONTENT_X,
      y: textMiddle - 2,
      text: data.brand,
      font: DISPLAY_2,
      color: palette.strong,
      align: "left",
      tracking: -30 * 0.025,
    },
    {
      op: "text",
      x: CONTENT_X,
      y: textMiddle + 20,
      text: data.link.label,
      font: qr === null ? BODY_STRONG : DATA_13,
      color: palette.muted,
      align: "left",
    },
  );

  const height = footerTop + footerH + CARD_PAD + CARD_INSET;

  return {
    width: WIDTH,
    height,
    // The ground and the card go in first: every op above is painted over them.
    ops: [
      { op: "rect", x: 0, y: 0, w: WIDTH, h: height, radius: 0, fill: palette.background },
      {
        op: "rect",
        x: CARD_INSET,
        y: CARD_INSET,
        w: WIDTH - CARD_INSET * 2,
        h: height - CARD_INSET * 2,
        radius: CARD_RADIUS,
        fill: palette.surface,
        // `shadow-card`: navy-tinted, offset and softly blurred, never a grey halo.
        shadow: { color: palette.shadow, blur: 28, offsetY: 12 },
      },
      ...ops,
    ],
  };
};
