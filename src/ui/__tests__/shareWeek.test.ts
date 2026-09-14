/**
 * The card's contents, built from the same resolved week the screen renders.
 *
 * The fixtures are the real RVT week, so what is asserted here is what a student would actually
 * send: their class, their form teacher, and the periods that week uses.
 */
import { describe, expect, it } from "vitest";
import { bootHarness, classIdOf, FIXTURE_DATE } from "./harness.tsx";
import { findClassTeacher, type ResolvedDay } from "../../lib/edupage/index.ts";
import { weekDates } from "../../lib/schedule/index.ts";
import { shareTheme } from "../share/palette.ts";
import { buildWeekImageData, weekShareFileName, weekShareText } from "../share/weekImage.ts";
import { translate } from "../i18n/index.ts";
import type { Translate } from "../i18n/index.ts";

const t: Translate = (key, params) => translate("lv", key, params);

const buildFor = async (short: string, options: { subjectColorCodingEnabled?: boolean } = {}) => {
  const { store } = await bootHarness();
  const classId = classIdOf(store, short);
  const dates = weekDates(FIXTURE_DATE);
  const state = store.getState();

  return buildWeekImageData({
    dates,
    days: dates.map((d) => state.resolvedDay(d, classId)),
    className: short,
    classTeacher: findClassTeacher(Object.values(state.timetables), classId)?.short ?? null,
    theme: shareTheme(),
    lang: "lv",
    t,
    ...options,
  });
};

describe("buildWeekImageData", () => {
  it("puts the class, its week and its form teacher on the card", async () => {
    const data = await buildFor("A1-2");

    expect(data.className).toBe("A1-2");
    expect(data.period).toMatch(/07\.09/);
    expect(data.classTeacher?.label).toBe("Klases audzinātājs");
    expect(data.classTeacher?.name).not.toBe("");
  });

  it("is Monday to Friday, with the date under each weekday", async () => {
    // The columns are the week the app shows, not "the next five days".
    const data = await buildFor("A1-2");

    expect(data.columns).toHaveLength(5);
    expect(data.columns[0]?.weekday.toLowerCase()).toContain("p");
    expect(data.columns[0]?.date).toMatch(/7\.\s?0?9/);
  });

  it("gives every row a start and an end time", async () => {
    const data = await buildFor("A1-2");

    expect(data.rows.length).toBeGreaterThan(0);
    for (const row of data.rows) {
      expect(row.start).toMatch(/^\d{1,2}:\d{2}$/);
      expect(row.end).toMatch(/^\d{1,2}:\d{2}$/);
      expect(row.cells).toHaveLength(5);
    }
  });

  it("colours a lesson the way the app does and names its room", async () => {
    const data = await buildFor("A1-2");
    const cells = data.rows.flatMap((row) => row.cells).filter((cell) => cell !== null);

    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.label).not.toBe("");
      expect(cell.fill).toMatch(/^#/);
      expect(cell.ink).toMatch(/^#/);
    }
    expect(cells.some((cell) => (cell.detail ?? "") !== "")).toBe(true);
  });

  it("collapses every cell and legend entry to the neutral tone with colour-coding off", async () => {
    const withCoding = await buildFor("A1-2");
    const withoutCoding = await buildFor("A1-2", { subjectColorCodingEnabled: false });
    const neutral = shareTheme().tones.sky;

    const cells = withoutCoding.rows.flatMap((row) => row.cells).filter((cell) => cell !== null);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.fill).toBe(neutral.fill);
      expect(cell.ink).toBe(neutral.ink);
    }
    for (const entry of withoutCoding.legend) {
      expect(entry.fill).toBe(neutral.fill);
    }

    // Sanity: the fixture week actually uses more than one tone normally, so this is testing the
    // switch, not a fixture that happens to be all-sky already.
    const withCodingFills = new Set(
      withCoding.rows
        .flatMap((row) => row.cells)
        .flatMap((cell) => (cell === null ? [] : [cell.fill])),
    );
    expect(withCodingFills.size).toBeGreaterThan(1);
  });

  it("says which days are at another building, in words", () => {
    // The fixture week is all main-building, so the travelling day is made here: this line is
    // the one thing a 40px cell cannot say, and the reason the card carries notes at all.
    const annexDay = {
      date: "2026-09-08",
      buildings: ["TIC"],
      building: "TIC",
      lessons: [],
    } as unknown as ResolvedDay;

    const data = buildWeekImageData({
      dates: ["2026-09-07", "2026-09-08"],
      days: [null, annexDay],
      className: "A1-2",
      classTeacher: null,
      theme: shareTheme(),
      lang: "lv",
      t,
    });

    expect(data.notes).toHaveLength(1);
    expect(data.notes[0]).toContain("TIC");
    expect(data.notes[0]).toMatch(/otr/i); // Tuesday, in Latvian
  });

  it("spells out every code the grid uses, so the card explains itself", async () => {
    const data = await buildFor("A1-2");
    const codes = new Set(
      data.rows.flatMap((row) => row.cells).flatMap((cell) => (cell === null ? [] : [cell.label])),
    );

    expect(data.legend.length).toBeGreaterThan(0);
    for (const entry of data.legend) {
      // The full name, not another abbreviation of it.
      expect(entry.name.length).toBeGreaterThan(entry.label.length);
      expect(entry.fill).toMatch(/^#/);
    }

    const explained = new Set(data.legend.map((entry) => entry.label));
    for (const code of codes) expect(explained.has(code)).toBe(true);
  });

  it("lists each subject once, in code order", async () => {
    const { legend } = await buildFor("DT3-2");
    const labels = legend.map((entry) => entry.label);

    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "lv")));
  });

  it("carries the way back to the app: a scannable code and the same address in words", async () => {
    const data = await buildFor("A1-2");

    expect(data.link.label).toBe("https://bit.ly/stundio");
    expect(data.link.qr).not.toBeNull();
    expect(data.brand).toBe("Stundio");
  });

  it("leaves nothing undrawable when the week is not cached at all", () => {
    const data = buildWeekImageData({
      dates: [],
      days: [],
      className: "A1-2",
      classTeacher: null,
      theme: shareTheme(),
      lang: "lv",
      t,
    });

    expect(data.period).toBe("");
    expect(data.rows).toEqual([]);
    expect(data.classTeacher).toBeNull();
  });
});

describe("the message the image travels with", () => {
  it("names the class and week, then points at the releases page", () => {
    const text = weekShareText("A1-2", "07.09.–11.09.", t);

    expect(text).toContain("A1-2");
    expect(text).toContain("07.09.–11.09.");
    expect(text).toContain("https://bit.ly/stundio");
  });

  it("names the file after the class and the Monday it starts on", () => {
    expect(weekShareFileName("A1-2", "2026-09-07")).toBe("stundio-a1-2-2026-09-07.png");
  });

  it("does not let a class name become a path", () => {
    expect(weekShareFileName("../A 1", undefined)).toBe("stundio--a-1-week.png");
  });
});

describe("shareTheme", () => {
  it("reads the live tokens so a dark-mode user shares a dark card", () => {
    const theme = shareTheme({
      getPropertyValue: (property) => (property === "--bg-app" ? " #0b0c10 " : ""),
    });

    expect(theme.palette.background).toBe("#0b0c10");
  });

  it("falls back to the design system's light values when no stylesheet has been applied", () => {
    const theme = shareTheme({ getPropertyValue: () => "" });

    expect(theme.palette.background).toBe("#f6f7fa");
    expect(theme.tones.sky).toEqual({ fill: "#9cc8f7", ink: "#0c3560" });
  });
});
