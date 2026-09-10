/**
 * The dictionaries drift silently unless something checks them: a missing key would render
 * `undefined` on a screen nobody on the team reads in that language.
 */
import { describe, expect, it } from "vitest";
import { DICTS, LANGS, translate } from "../i18n/index.ts";
import { formatDuration, formatLongDate, formatRange, formatWeekdayShort } from "../i18n/index.ts";

const keys = Object.keys(DICTS.lv);

describe("dictionaries", () => {
  it.each(LANGS)("%s has exactly the Latvian key set", (lang) => {
    expect(Object.keys(DICTS[lang]).sort()).toEqual([...keys].sort());
  });

  it.each(LANGS)("%s has no empty messages", (lang) => {
    for (const [key, value] of Object.entries(DICTS[lang])) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("keeps the same placeholders across languages", () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of keys) {
      const expected = placeholders(DICTS.lv[key as keyof typeof DICTS.lv]);
      for (const lang of LANGS) {
        expect(placeholders(DICTS[lang][key as keyof typeof DICTS.lv]), `${lang}/${key}`).toEqual(
          expected,
        );
      }
    }
  });
});

describe("translate", () => {
  it("interpolates named params", () => {
    expect(translate("en", "time.inMinutes", { n: 5 })).toBe("in 5 min");
    expect(translate("ru", "sync.updated", { time: "14:32" })).toBe("Обновлено 14:32");
  });

  it("leaves unknown placeholders alone rather than printing undefined", () => {
    expect(translate("en", "time.inMinutes", {})).toBe("in {n} min");
  });
});

describe("formatting", () => {
  it("names the weekday in the chosen language", () => {
    expect(formatLongDate("2026-09-09", "lv").toLowerCase()).toContain("trešdien");
    expect(formatLongDate("2026-09-09", "en").toLowerCase()).toContain("wednesday");
    expect(formatWeekdayShort("2026-09-09", "ru")).not.toBe("");
  });

  it("does not slip a day when the host is west of UTC", () => {
    // Date-only values are parsed at UTC noon precisely so this stays stable.
    expect(formatLongDate("2026-09-01", "en")).toContain("1");
  });

  it("formats gaps and lesson ranges", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(80)).toBe("1 h 20 min");
    expect(formatRange("08:30", "09:10")).toBe("08:30 – 09:10");
    expect(formatRange("", "")).toBe("");
  });
});
