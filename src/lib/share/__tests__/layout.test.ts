/**
 * The card's geometry. Asserting on the display list rather than on pixels keeps these tests
 * about what a reader of the shared image sees: the times, the teacher, which lessons are
 * struck through, the way back to the app, and that nothing is drawn outside the card.
 */
import { describe, expect, it } from "vitest";
import { clip, layoutShareImage, type ShareOp } from "../layout.ts";
import { encodeQr } from "../qr.ts";
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
  shadow: "rgba(6, 11, 61, 0.16)",
};

const cell = (label: string, extra: Partial<ShareCell> = {}): ShareCell => ({
  label,
  fill: "#9cc8f7",
  ink: "#0c3560",
  ...extra,
});

const data = (overrides: Partial<ShareImageData> = {}): ShareImageData => ({
  className: "A1-2",
  period: "07.09.–11.09.",
  classTeacher: { label: "Klases audzinātājs", name: "Pleča Sintija" },
  columns: [
    { weekday: "Pr", date: "7.09." },
    { weekday: "Ot", date: "8.09." },
  ],
  rows: [
    {
      period: "1",
      start: "08:30",
      end: "09:10",
      cells: [cell("PRG", { detail: "312" }), null],
    },
  ],
  legend: [
    {
      label: "PRG",
      name: "Algoritmēšanas un programmēšanas pamati",
      fill: "#9cc8f7",
      ink: "#0c3560",
    },
  ],
  notes: ["TIC: Ot"],
  brand: "Stundio",
  link: { label: "shorturl.at/pPrzh", qr: null },
  ...overrides,
});

const texts = (ops: ShareOp[]): string[] =>
  ops.flatMap((op) => (op.op === "text" ? [op.text] : []));

describe("layoutShareImage", () => {
  it("draws everything the card promises: class, week, teacher, times and the way back", () => {
    const drawn = texts(layoutShareImage(data(), palette).ops);

    expect(drawn).toContain("A1-2");
    expect(drawn).toContain("07.09.–11.09.");
    expect(drawn).toContain("Klases audzinātājs: Pleča Sintija");
    expect(drawn).toContain("08:30");
    expect(drawn).toContain("–09:10"); // the end time the app's own grid leaves out
    expect(drawn).toContain("TIC: Ot");
    expect(drawn).toContain("Stundio");
    expect(drawn).toContain("shorturl.at/pPrzh");
  });

  it("never draws the period key — it is there to line cells up, not to be read", () => {
    const drawn = texts(layoutShareImage(data(), palette).ops);
    expect(drawn).not.toContain("1");
  });

  it("leaves the teacher line out entirely when the school publishes none", () => {
    const { ops, height } = layoutShareImage(data({ classTeacher: null }), palette);
    expect(texts(ops).some((text) => text.includes("Klases"))).toBe(false);
    // ...and does not leave a gap where it would have been.
    expect(height).toBeLessThan(layoutShareImage(data(), palette).height);
  });

  it("grows with the week rather than padding a fixed canvas", () => {
    const one = layoutShareImage(data(), palette).height;
    const two = layoutShareImage(
      data({
        rows: [
          ...data().rows,
          { period: "2", start: "09:20", end: "10:00", cells: [cell("MAT"), null] },
        ],
      }),
      palette,
    ).height;

    expect(two).toBeGreaterThan(one);
  });

  it("sits the card on the app ground, lifted by a tinted shadow", () => {
    const [ground, card] = layoutShareImage(data(), palette).ops;

    expect(ground).toMatchObject({ op: "rect", x: 0, y: 0, fill: palette.background });
    expect(card).toMatchObject({
      op: "rect",
      radius: 28, // the design system's standard card
      fill: palette.surface,
      shadow: { color: palette.shadow },
    });
  });

  it("fills a free slot with the sunken surface and a hairline, never a blank hole", () => {
    const ops = layoutShareImage(data(), palette).ops;
    const empty = ops.filter((op) => op.op === "rect" && op.fill === palette.sunken);

    // One free cell, plus the building note's pill.
    expect(empty.length).toBeGreaterThanOrEqual(1);
    expect(empty[0]).toMatchObject({ stroke: palette.hairline, radius: 12 });
  });

  it("strikes a cancelled lesson through and fades it, keeping it in place", () => {
    const ops = layoutShareImage(
      data({
        rows: [
          {
            period: "1",
            start: "08:30",
            end: "09:10",
            cells: [cell("PRG", { cancelled: true }), null],
          },
        ],
      }),
      palette,
    ).ops;

    const label = ops.find((op) => op.op === "text" && op.text === "PRG");
    expect(label).toMatchObject({ alpha: 0.55 });
    expect(ops.some((op) => op.op === "line" && op.color === "#0c3560")).toBe(true);
  });

  it("rings a lesson that is in another building", () => {
    const ops = layoutShareImage(
      data({
        rows: [
          {
            period: "1",
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

  it("sets the weekday headings in the one style this system uppercases", () => {
    const heading = layoutShareImage(data(), palette).ops.find(
      (op) => op.op === "text" && op.text === "PR",
    );

    expect(heading).toMatchObject({ font: expect.stringContaining("11px") as string });
    expect(heading).toMatchObject({ tracking: expect.closeTo(11 * 0.14) as number });
  });

  describe("the key to the codes", () => {
    it("draws a swatch and the full subject name for every entry", () => {
      const { ops } = layoutShareImage(data(), palette);
      const drawn = texts(ops);

      expect(drawn).toContain("PRG");
      expect(drawn).toContain("Algoritmēšanas un programmēšanas pamati");
    });

    it("wraps a name too long for one line instead of cutting it", () => {
      const long =
        "Ritošā sastāva enerģētisko iekārtu un palīgiekārtu tehniskās apkopes un remonta veikšana PB4";
      const drawn = texts(
        layoutShareImage(
          data({ legend: [{ label: "RSE", name: long, fill: "#9cc8f7", ink: "#0c3560" }] }),
          palette,
        ).ops,
      );

      const lines = drawn.filter(
        (text) => long.startsWith(text.replace("…", "")) || text.endsWith("PB4"),
      );
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.join(" ").replace(/…/g, "")).not.toBe("");
    });

    it("takes no room at all when there is nothing to explain", () => {
      expect(layoutShareImage(data({ legend: [] }), palette).height).toBeLessThan(
        layoutShareImage(data(), palette).height,
      );
    });
  });

  describe("the QR block", () => {
    const withQr = data({ link: { label: "shorturl.at/pPrzh", qr: encodeQr("https://a.bc/d") } });
    // A dark theme, so the code's own white plate is the only white rect to find. In light mode
    // it is the same colour as the card it sits on, which is exactly why it needs to exist.
    const dark: SharePalette = { ...palette, surface: "#16181f", strong: "#ffffff" };

    it("draws one square per dark module on a light plate", () => {
      const ops = layoutShareImage(withQr, dark).ops;
      const modules = ops.filter((op) => op.op === "rect" && op.fill === "#0b0c10");
      const plate = ops.filter((op) => op.op === "rect" && op.fill === "#ffffff");

      expect(plate).toHaveLength(1);
      expect(modules.length).toBeGreaterThan(50);
    });

    it("keeps the code dark-on-light whatever the theme, because a camera needs it that way", () => {
      const ops = layoutShareImage(withQr, dark).ops;

      expect(ops.some((op) => op.op === "rect" && op.fill === "#ffffff")).toBe(true);
      expect(ops.some((op) => op.op === "rect" && op.fill === "#0b0c10")).toBe(true);
    });

    it("surrounds the code with the quiet zone a scanner needs to find it", () => {
      const ops = layoutShareImage(withQr, dark).ops;
      const plate = ops.find((op) => op.op === "rect" && op.fill === "#ffffff");
      const modules = ops.filter((op) => op.op === "rect" && op.fill === "#0b0c10");

      const left = Math.min(...modules.map((op) => (op.op === "rect" ? op.x : 0)));
      const top = Math.min(...modules.map((op) => (op.op === "rect" ? op.y : 0)));
      const module = modules[0]?.op === "rect" ? modules[0].w : 0;

      // The format asks for four modules of light on every side, whatever the module size.
      expect(plate?.op === "rect" ? left - plate.x : 0).toBe(module * 4);
      expect(plate?.op === "rect" ? top - plate.y : 0).toBe(module * 4);
    });

    it("draws modules big enough to be found in a full-page image", () => {
      const modules = layoutShareImage(withQr, dark).ops.filter(
        (op) => op.op === "rect" && op.fill === "#0b0c10",
      );

      // Below this a detector loses the code in the whole frame — measured, not guessed.
      expect(modules[0]?.op === "rect" ? modules[0].w : 0).toBeGreaterThanOrEqual(5);
    });

    it("still gives the address in words when the code cannot be built", () => {
      const drawn = texts(layoutShareImage(data(), palette).ops);
      expect(drawn).toContain("shorturl.at/pPrzh");
    });

    it("makes room for itself — a taller footer than the wordmark alone needs", () => {
      expect(layoutShareImage(withQr, palette).height).toBeGreaterThan(
        layoutShareImage(data(), palette).height,
      );
    });
  });

  it("keeps every drawn op inside the image", () => {
    const { width, height, ops } = layoutShareImage(
      data({ link: { label: "shorturl.at/pPrzh", qr: encodeQr("https://a.bc/d") } }),
      palette,
    );

    for (const op of ops) {
      expect(op.x).toBeGreaterThanOrEqual(0);
      expect(op.x).toBeLessThanOrEqual(width);
      expect(op.y).toBeLessThanOrEqual(height);
      if (op.op === "rect") {
        expect(op.x + op.w).toBeLessThanOrEqual(width + 0.001);
        expect(op.y + op.h).toBeLessThanOrEqual(height + 0.001);
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
