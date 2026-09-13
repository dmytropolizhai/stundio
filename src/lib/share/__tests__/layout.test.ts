/**
 * The card's geometry. Asserting on the display list rather than on pixels keeps these tests
 * about what a reader of the shared image sees: the times, the teacher, which lessons are
 * struck through, and that nothing is drawn outside the card.
 */
import { describe, expect, it } from "vitest";
import { clip, layoutShareImage, type ShareOp } from "../layout.ts";
import type { ShareCell, ShareImageData, SharePalette } from "../types.ts";

const palette: SharePalette = {
  background: "#f6f7fa",
  surface: "#ffffff",
  sunken: "#edeff4",
  hairline: "#dde1ea",
  strongBorder: "#b9bfce",
  text: "#2a2d36",
  strong: "#0b0c10",
  muted: "#5b6070",
};

const cell = (label: string, extra: Partial<ShareCell> = {}): ShareCell => ({
  label,
  fill: "#9cc8f7",
  ink: "#0c3560",
  ...extra,
});

const data = (overrides: Partial<ShareImageData> = {}): ShareImageData => ({
  eyebrow: "Stundu saraksts",
  className: "A1-2",
  period: "07.09.–11.09.",
  classTeacher: { label: "Klases audzinātājs", name: "Pleča Sintija" },
  columns: [
    { weekday: "Pr", date: "7.09." },
    { weekday: "Ot", date: "8.09." },
  ],
  rows: [
    {
      period: "1.",
      start: "08:30",
      end: "09:10",
      cells: [cell("PRG", { detail: "312" }), null],
    },
  ],
  notes: ["TIC: Ot"],
  brand: "Stundio",
  link: "github.com/dmytropolizhai/stundio/releases",
  ...overrides,
});

const texts = (ops: ShareOp[]): string[] =>
  ops.flatMap((op) => (op.op === "text" ? [op.text] : []));

describe("layoutShareImage", () => {
  it("draws everything the card promises: class, week, teacher, times and the link", () => {
    const drawn = texts(layoutShareImage(data(), palette).ops);

    expect(drawn).toContain("A1-2");
    expect(drawn).toContain("07.09.–11.09.");
    expect(drawn).toContain("Klases audzinātājs: Pleča Sintija");
    expect(drawn).toContain("08:30");
    expect(drawn).toContain("–09:10"); // the end time the app's own grid leaves out
    expect(drawn).toContain("TIC: Ot");
    expect(drawn).toContain("github.com/dmytropolizhai/stundio/releases");
  });

  it("leaves the teacher line out entirely when the school publishes none", () => {
    const { ops, height } = layoutShareImage(data({ classTeacher: null }), palette);
    expect(texts(ops).some((t) => t.includes("Klases"))).toBe(false);
    // ...and does not leave a gap where it would have been.
    expect(height).toBeLessThan(layoutShareImage(data(), palette).height);
  });

  it("grows with the week rather than padding a fixed canvas", () => {
    const one = layoutShareImage(data(), palette).height;
    const two = layoutShareImage(
      data({
        rows: [
          ...data().rows,
          { period: "2.", start: "09:20", end: "10:00", cells: [cell("MAT"), null] },
        ],
      }),
      palette,
    ).height;

    expect(two).toBeGreaterThan(one);
  });

  it("fills a free slot with the sunken surface and a hairline, never a blank hole", () => {
    const ops = layoutShareImage(data(), palette).ops;
    const empty = ops.filter((op) => op.op === "rect" && op.fill === palette.sunken);

    expect(empty).toHaveLength(1);
    expect(empty[0]).toMatchObject({ stroke: palette.hairline });
  });

  it("strikes a cancelled lesson through and fades it", () => {
    const ops = layoutShareImage(
      data({
        rows: [
          {
            period: "1.",
            start: "08:30",
            end: "09:10",
            cells: [cell("PRG", { cancelled: true }), null],
          },
        ],
      }),
      palette,
    ).ops;

    const label = ops.find((op) => op.op === "text" && op.text === "PRG");
    expect(label).toMatchObject({ alpha: 0.45 });
    expect(ops.some((op) => op.op === "line" && op.color === "#0c3560")).toBe(true);
  });

  it("rings a lesson that is in another building", () => {
    const ops = layoutShareImage(
      data({
        rows: [
          {
            period: "1.",
            start: "08:30",
            end: "09:10",
            cells: [cell("IKT", { outlined: true }), null],
          },
        ],
      }),
      palette,
    ).ops;

    expect(ops.some((op) => op.op === "rect" && op.stroke === palette.strongBorder)).toBe(true);
  });

  it("keeps every drawn op inside the image", () => {
    const { width, height, ops } = layoutShareImage(data(), palette);

    for (const op of ops) {
      expect(op.x).toBeGreaterThanOrEqual(0);
      expect(op.x).toBeLessThanOrEqual(width);
      expect(op.y).toBeLessThanOrEqual(height);
      if (op.op === "rect") {
        expect(op.x + op.w).toBeLessThanOrEqual(width + 0.001);
        expect(op.y + op.h).toBeLessThanOrEqual(height);
      }
    }
  });

  it("survives a week with nothing in it", () => {
    const { ops, height } = layoutShareImage(
      data({ columns: [], rows: [], notes: [], classTeacher: null }),
      palette,
    );

    expect(height).toBeGreaterThan(0);
    expect(texts(ops)).toContain("A1-2");
  });

  it("paints the ground before anything else", () => {
    const [first] = layoutShareImage(data(), palette).ops;
    expect(first).toMatchObject({ op: "rect", x: 0, y: 0, fill: palette.background });
  });
});

describe("clip", () => {
  it("leaves text that fits alone", () => {
    expect(clip("PRG", 5)).toBe("PRG");
  });

  it("ellipsises what does not, without a dangling space", () => {
    expect(clip("Programmēšana un datori", 8)).toBe("Program…");
    expect(clip("ab cdef", 4)).toBe("ab…");
  });

  it("handles a budget of nothing", () => {
    expect(clip("PRG", 0)).toBe("…");
  });
});
