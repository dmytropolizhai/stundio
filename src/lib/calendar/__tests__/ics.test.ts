/**
 * The serializer's contract with calendar apps: CRLF, octet-based folding, TEXT escaping, the
 * Riga VTIMEZONE, and that a cancelled lesson stays in the file as CANCELLED. Asserted on the
 * text itself, since that is all Google, Apple and Outlook ever see.
 */
import { describe, expect, it } from "vitest";
import { escapeText, foldLine, icsFileName, serializeCalendar } from "../ics.ts";
import type { CalendarEvent } from "../types.ts";

const NOW = new Date("2026-08-30T12:34:56.789Z");

const maths: CalendarEvent = {
  uid: "maths-2026-09-01-1@stundio",
  date: "2026-09-01",
  start: "08:30",
  end: "09:10",
  title: "Mathematics",
  location: "201",
  description: "Teachers: A. Ozols\nGroup: 1",
  change: "none",
  sequence: 0,
};

const cancelled: CalendarEvent = {
  uid: "phys-2026-09-01-2@stundio",
  date: "2026-09-01",
  start: "09:20",
  end: "10:00",
  title: "⚠ Physics (cancelled)",
  location: "",
  description: "",
  change: "cancelled",
  sequence: 1,
};

const octets = (s: string): number => new TextEncoder().encode(s).length;
const unfold = (s: string): string => s.replace(/\r\n /g, "");

describe("escapeText", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    expect(escapeText("a\\b;c,d\ne")).toBe("a\\\\b\;c\\,d\\ne");
  });
  it("normalises CRLF and lone CR to a literal \\n", () => {
    expect(escapeText("a\r\nb\rc")).toBe("a\\nb\\nc");
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds ASCII at 75 octets with a single-space continuation", () => {
    const parts = foldLine("X:" + "a".repeat(200)).split("\r\n");
    expect(octets(parts[0] ?? "")).toBe(75);
    for (const p of parts.slice(1)) {
      expect(p.startsWith(" ")).toBe(true);
      expect(octets(p)).toBeLessThanOrEqual(75);
    }
    expect(parts.join("").replace(/ /g, "")).toBe("X:" + "a".repeat(200));
  });

  it("never splits multi-byte characters or surrogate pairs", () => {
    const text = "SUMMARY:" + "āšž⚠😀".repeat(30);
    const folded = foldLine(text);
    for (const p of folded.split("\r\n")) {
      expect(octets(p)).toBeLessThanOrEqual(75);
      expect(p).not.toContain("�");
    }
    expect(unfold(folded)).toBe(text);
    // Every physical line must itself be well-formed UTF-16 (no lone surrogates).
    for (const p of folded.split("\r\n")) {
      expect(p.isWellFormed()).toBe(true);
    }
  });
});

describe("serializeCalendar", () => {
  it("uses CRLF throughout and ends with a CRLF", () => {
    const out = serializeCalendar([maths], { name: "Timetable", now: NOW });
    expect(out.endsWith("\r\n")).toBe(true);
    expect(out.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("emits the calendar header and Riga timezone", () => {
    const out = serializeCalendar([], { name: "4PT-1, Riga", now: NOW });
    const lines = out.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("PRODID:-//Stundio//Timetable//EN");
    expect(lines).toContain("CALSCALE:GREGORIAN");
    expect(lines).toContain("METHOD:PUBLISH");
    expect(lines).toContain("X-WR-CALNAME:4PT-1\\, Riga");
    expect(lines).toContain("X-WR-TIMEZONE:Europe/Riga");
    expect(lines).toContain("TZID:Europe/Riga");
    expect(lines).toContain("TZOFFSETFROM:+0300");
    expect(lines).toContain("RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU");
    expect(lines).toContain("RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU");
    expect(lines).toContain("TZNAME:EEST");
    expect(lines).toContain("TZNAME:EET");
  });

  it("honours a custom PRODID", () => {
    expect(serializeCalendar([], { name: "x", now: NOW, prodId: "-//Fork//EN" })).toContain(
      "PRODID:-//Fork//EN\r\n",
    );
  });

  it("is still a valid calendar with no events", () => {
    const out = serializeCalendar([], { name: "Empty", now: NOW });
    expect(out).not.toContain("BEGIN:VEVENT");
    expect(out.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("marks cancelled lessons CANCELLED/TRANSPARENT and keeps them in the file", () => {
    const out = serializeCalendar([cancelled], { name: "T", now: NOW });
    expect(out).toContain("UID:phys-2026-09-01-2@stundio\r\n");
    expect(out).toContain("STATUS:CANCELLED\r\n");
    expect(out).toContain("TRANSP:TRANSPARENT\r\n");
    expect(out).toContain("SEQUENCE:1\r\n");
    expect(out).toContain("CATEGORIES:Cancelled\r\n");
  });

  it("keeps substituted lessons confirmed but still categorised and sequenced", () => {
    const sub: CalendarEvent = { ...maths, change: "substituted", sequence: 1 };
    const out = serializeCalendar([sub], { name: "T", now: NOW });
    expect(out).toContain("STATUS:CONFIRMED\r\n");
    expect(out).toContain("TRANSP:OPAQUE\r\n");
    expect(out).toContain("SEQUENCE:1\r\n");
    expect(out).toContain("CATEGORIES:Substituted\r\n");
  });

  it("omits empty LOCATION and DESCRIPTION, and CATEGORIES for unchanged lessons", () => {
    const bare: CalendarEvent = { ...maths, location: "", description: "" };
    const out = serializeCalendar([bare], { name: "T", now: NOW });
    expect(out).not.toContain("LOCATION");
    expect(out).not.toContain("DESCRIPTION");
    expect(out).not.toContain("CATEGORIES");
  });

  it("folds long lines of the serialized output within 75 octets", () => {
    const long: CalendarEvent = { ...maths, description: "Piezīme: " + "ā".repeat(120) };
    const out = serializeCalendar([long], { name: "T", now: NOW });
    for (const line of out.split("\r\n")) expect(octets(line)).toBeLessThanOrEqual(75);
    expect(unfold(out)).toContain("DESCRIPTION:Piezīme: " + "ā".repeat(120));
  });

  it("is deterministic for equal input and keeps the caller's order", () => {
    const a = serializeCalendar([cancelled, maths], { name: "T", now: NOW });
    const b = serializeCalendar([cancelled, maths], { name: "T", now: NOW });
    expect(a).toBe(b);
    expect(a.indexOf("phys-")).toBeLessThan(a.indexOf("maths-"));
  });

  it("matches the golden output for a two-event calendar", () => {
    const out = serializeCalendar([maths, cancelled], { name: "4PT-1", now: NOW });
    expect(out).toBe(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Stundio//Timetable//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:4PT-1",
        "X-WR-TIMEZONE:Europe/Riga",
        "BEGIN:VTIMEZONE",
        "TZID:Europe/Riga",
        "BEGIN:STANDARD",
        "DTSTART:19701025T040000",
        "TZOFFSETFROM:+0300",
        "TZOFFSETTO:+0200",
        "TZNAME:EET",
        "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
        "END:STANDARD",
        "BEGIN:DAYLIGHT",
        "DTSTART:19700329T030000",
        "TZOFFSETFROM:+0200",
        "TZOFFSETTO:+0300",
        "TZNAME:EEST",
        "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
        "END:DAYLIGHT",
        "END:VTIMEZONE",
        "BEGIN:VEVENT",
        "UID:maths-2026-09-01-1@stundio",
        "DTSTAMP:20260830T123456Z",
        "DTSTART;TZID=Europe/Riga:20260901T083000",
        "DTEND;TZID=Europe/Riga:20260901T091000",
        "SUMMARY:Mathematics",
        "LOCATION:201",
        "DESCRIPTION:Teachers: A. Ozols\\nGroup: 1",
        "SEQUENCE:0",
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:phys-2026-09-01-2@stundio",
        "DTSTAMP:20260830T123456Z",
        "DTSTART;TZID=Europe/Riga:20260901T092000",
        "DTEND;TZID=Europe/Riga:20260901T100000",
        "SUMMARY:⚠ Physics (cancelled)",
        "SEQUENCE:1",
        "STATUS:CANCELLED",
        "TRANSP:TRANSPARENT",
        "CATEGORIES:Cancelled",
        "END:VEVENT",
        "END:VCALENDAR",
        "",
      ].join("\r\n"),
    );
  });
});

describe("icsFileName", () => {
  const range = { from: "2026-09-01", to: "2026-09-05" };
  it("builds the default name", () => {
    expect(icsFileName(range)).toBe("stundio-2026-09-01_2026-09-05.ics");
  });
  it("strips diacritics and unsafe characters from the base", () => {
    expect(icsFileName(range, "Rīgas Valsts/tehnikums ✨")).toBe(
      "rigas-valsts-tehnikums-2026-09-01_2026-09-05.ics",
    );
  });
  it("falls back when the base sanitises to nothing", () => {
    expect(icsFileName(range, "✨✨")).toBe("stundio-2026-09-01_2026-09-05.ics");
  });
});
