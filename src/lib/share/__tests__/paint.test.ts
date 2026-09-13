/**
 * The painter, exercised against a recording context — happy-dom has no canvas, and the point
 * of `paint.ts` is that it needs none: it replays a display list and nothing more.
 */
import { describe, expect, it } from "vitest";
import { paintShareImage, type ShareContext } from "../paint.ts";
import type { ShareImageLayout } from "../layout.ts";

type Recorder = ShareContext & { calls: string[]; alphas: number[] };

const recorder = (): Recorder => {
  const calls: string[] = [];
  const alphas: number[] = [];
  const record = (name: string) =>
    function (this: Recorder, ...args: unknown[]): void {
      calls.push(args.length === 0 ? name : `${name}(${args.join(",")})`);
      if (name === "fill" || name === "stroke" || name === "fillText")
        alphas.push(this.globalAlpha);
    };

  return {
    calls,
    alphas,
    save: record("save"),
    restore: record("restore"),
    scale: record("scale"),
    beginPath: record("beginPath"),
    moveTo: record("moveTo"),
    lineTo: record("lineTo"),
    arcTo: record("arcTo"),
    closePath: record("closePath"),
    fill: record("fill"),
    stroke: record("stroke"),
    fillText: record("fillText"),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
    globalAlpha: 1,
  };
};

const layout = (ops: ShareImageLayout["ops"]): ShareImageLayout => ({
  width: 100,
  height: 50,
  ops,
});

describe("paintShareImage", () => {
  it("scales once, around everything it draws", () => {
    const ctx = recorder();
    paintShareImage(ctx, layout([]), 2);

    expect(ctx.calls[0]).toBe("save");
    expect(ctx.calls[1]).toBe("scale(2,2)");
    expect(ctx.calls.at(-1)).toBe("restore");
  });

  it("draws a filled rounded rect as a closed arcTo path", () => {
    const ctx = recorder();
    paintShareImage(
      ctx,
      layout([{ op: "rect", x: 0, y: 0, w: 20, h: 10, radius: 4, fill: "#fff" }]),
      1,
    );

    expect(ctx.calls).toContain("beginPath");
    expect(ctx.calls.filter((c) => c.startsWith("arcTo"))).toHaveLength(4);
    expect(ctx.calls).toContain("closePath");
    expect(ctx.calls).toContain("fill");
    expect(ctx.calls).not.toContain("stroke");
  });

  it("clamps the corner radius to the box, so a thin row never inverts", () => {
    const ctx = recorder();
    paintShareImage(
      ctx,
      layout([{ op: "rect", x: 0, y: 0, w: 4, h: 4, radius: 40, fill: "#fff" }]),
      1,
    );

    expect(ctx.calls).toContain("moveTo(2,0)");
  });

  it("strokes a rect that asks for an outline, at the width it asks for", () => {
    const ctx = recorder();
    paintShareImage(
      ctx,
      layout([{ op: "rect", x: 0, y: 0, w: 8, h: 8, radius: 2, stroke: "#000", lineWidth: 3 }]),
      1,
    );

    expect(ctx.calls).toContain("stroke");
    expect(ctx.lineWidth).toBe(3);
  });

  it("draws text on the baseline the layout placed it on", () => {
    const ctx = recorder();
    paintShareImage(
      ctx,
      layout([
        {
          op: "text",
          x: 10,
          y: 20,
          text: "PRG",
          font: "700 22px X",
          color: "#111",
          align: "center",
        },
      ]),
      1,
    );

    expect(ctx.calls).toContain("fillText(PRG,10,20)");
    expect(ctx.textAlign).toBe("center");
    expect(ctx.textBaseline).toBe("alphabetic");
    expect(ctx.font).toBe("700 22px X");
  });

  it("draws a line as a horizontal segment", () => {
    const ctx = recorder();
    paintShareImage(ctx, layout([{ op: "line", x: 4, y: 9, w: 16, color: "#ccc", width: 1 }]), 1);

    expect(ctx.calls).toContain("moveTo(4,9)");
    expect(ctx.calls).toContain("lineTo(20,9)");
  });

  it("applies an op's alpha while drawing it, and resets it before finishing", () => {
    const ctx = recorder();
    paintShareImage(
      ctx,
      layout([
        { op: "text", x: 0, y: 0, text: "x", font: "f", color: "#000", align: "left", alpha: 0.45 },
        { op: "text", x: 0, y: 0, text: "y", font: "f", color: "#000", align: "left" },
      ]),
      1,
    );

    expect(ctx.alphas).toEqual([0.45, 1]);
    expect(ctx.globalAlpha).toBe(1);
  });
});
