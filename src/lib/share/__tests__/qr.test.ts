/**
 * The QR encoder, checked module-for-module against an independent implementation.
 *
 * A code that scans is the only acceptable outcome here: a card that ships a subtly wrong symbol
 * looks perfect and works for nobody. So the goldens in `qr.fixtures.ts` come from a different
 * encoder entirely — agreement on every module of every symbol is what says this one is right.
 */
import { describe, expect, it } from "vitest";
import { encodeQr, QrTooLongError, type QrMatrix } from "../qr.ts";
import { QR_GOLDENS } from "./qr.fixtures.ts";

const render = (matrix: QrMatrix): string[] =>
  matrix.map((row) => row.map((dark) => (dark ? "1" : "0")).join(""));

describe("encodeQr", () => {
  it.each(QR_GOLDENS)("matches the reference encoder: $note", ({ text, rows, version }) => {
    const matrix = encodeQr(text);

    expect(matrix).toHaveLength(version * 4 + 17);
    expect(render(matrix)).toEqual(rows);
  });

  it("picks the smallest symbol that fits, so the modules stay as large as possible", () => {
    expect(encodeQr("a")).toHaveLength(21); // version 1
    expect(encodeQr("x".repeat(20))).toHaveLength(25); // version 2
    expect(encodeQr("x".repeat(100))).toHaveLength(41); // version 6
  });

  it("encodes text as UTF-8 bytes rather than dropping what is not ASCII", () => {
    // "ā" is two bytes, so this must land one version higher than its character count suggests.
    expect(encodeQr("ā".repeat(13))).toHaveLength(25);
    expect(encodeQr("a".repeat(13))).toHaveLength(21);
  });

  it("refuses input past what a version-6 symbol holds, rather than emitting a broken one", () => {
    expect(() => encodeQr("x".repeat(107))).toThrow(QrTooLongError);
  });

  describe("the symbol's fixed furniture", () => {
    const matrix = encodeQr("https://shorturl.at/pPrzh");
    const size = matrix.length;
    const at = (row: number, col: number): boolean => matrix[row]?.[col] ?? false;

    it("puts a finder pattern in three corners, each ringed by light", () => {
      for (const [row, col] of [
        [0, 0],
        [0, size - 7],
        [size - 7, 0],
      ] as const) {
        expect(at(row + 0, col + 0)).toBe(true);
        expect(at(row + 1, col + 1)).toBe(false); // the light ring inside the eye
        expect(at(row + 3, col + 3)).toBe(true); // the 3×3 core
      }

      // The separator: the row and column just past the top-left eye are light.
      for (let i = 0; i <= 7; i += 1) {
        expect(at(7, i)).toBe(false);
        expect(at(i, 7)).toBe(false);
      }
    });

    it("runs an alternating timing ruler between the eyes", () => {
      for (let i = 8; i < size - 8; i += 1) {
        expect(at(6, i)).toBe(i % 2 === 0);
        expect(at(i, 6)).toBe(i % 2 === 0);
      }
    });

    it("always sets the dark module", () => {
      expect(at(size - 8, 8)).toBe(true);
    });
  });

  it("is deterministic — the same text always gives the same symbol", () => {
    expect(render(encodeQr("stundio"))).toEqual(render(encodeQr("stundio")));
  });
});
