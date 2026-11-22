/**
 * The Google Calendar API stage: which calendar gets written to, what each lesson looks like on
 * the wire, and how refusals surface — all against a fake `fetch`, never the network.
 */
import { describe, expect, it, vi } from "vitest";
import {
  GOOGLE_CALENDAR_SCOPE,
  GoogleAuthError,
  ensureCalendar,
  exportToGoogleCalendar,
  toGoogleEvent,
} from "../google.ts";
import type { CalendarEvent } from "../types.ts";

const lesson = (n: number, over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  uid: `uid-${n}@stundio`,
  date: "2026-09-09",
  start: "08:30",
  end: "09:10",
  title: `Lesson ${n}`,
  location: "101",
  description: "Teachers: A. Bērziņa",
  change: "none",
  sequence: 0,
  ...over,
});

const json = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Call = { url: string; method: string; body: unknown; auth: string };

/** A fake Google: records calls and answers by route. */
const fakeGoogle = (routes: Record<string, (call: Call) => Response>) => {
  const calls: Call[] = [];
  const fetchFn = vi.fn((input: string, init?: RequestInit) => {
    const url = input;
    const call: Call = {
      url,
      method: init?.method ?? "GET",
      body: init?.body === undefined ? undefined : JSON.parse(init.body as string),
      auth: (init?.headers as Record<string, string>).Authorization ?? "",
    };
    calls.push(call);
    const key = Object.keys(routes).find((k) => `${call.method} ${url}`.includes(k));
    return Promise.resolve(key === undefined ? json(404) : routes[key]!(call));
  });
  return { calls, deps: { token: "tok", fetch: fetchFn as unknown as typeof fetch } };
};

describe("toGoogleEvent", () => {
  it("keeps Riga wall-clock times and the stable UID", () => {
    expect(toGoogleEvent(lesson(1))).toEqual({
      iCalUID: "uid-1@stundio",
      summary: "Lesson 1",
      start: { dateTime: "2026-09-09T08:30:00", timeZone: "Europe/Riga" },
      end: { dateTime: "2026-09-09T09:10:00", timeZone: "Europe/Riga" },
      status: "confirmed",
      sequence: 0,
      location: "101",
      description: "Teachers: A. Bērziņa",
    });
  });

  it("marks a cancelled lesson cancelled and omits empty fields", () => {
    const out = toGoogleEvent(lesson(2, { change: "cancelled", location: "", description: "" }));
    expect(out).toMatchObject({ status: "cancelled" });
    expect(out).not.toHaveProperty("location");
    expect(out).not.toHaveProperty("description");
  });

  it("asks only for the narrow app-created-calendars scope", () => {
    expect(GOOGLE_CALENDAR_SCOPE).toBe("https://www.googleapis.com/auth/calendar.app.created");
  });
});

describe("ensureCalendar", () => {
  it("reuses a remembered calendar that still exists", async () => {
    const g = fakeGoogle({
      "GET https://www.googleapis.com/calendar/v3/calendars/abc": () => json(200),
    });
    expect(await ensureCalendar(g.deps, "Stundio", "abc")).toBe("abc");
    expect(g.calls).toHaveLength(1);
  });

  it("creates a Riga-time calendar when none is remembered", async () => {
    const g = fakeGoogle({
      "POST https://www.googleapis.com/calendar/v3/calendars": () => json(200, { id: "new-id" }),
    });
    expect(await ensureCalendar(g.deps, "Stundio · A1-2", "")).toBe("new-id");
    expect(g.calls[0]?.body).toEqual({ summary: "Stundio · A1-2", timeZone: "Europe/Riga" });
    expect(g.calls[0]?.auth).toBe("Bearer tok");
  });

  it("creates a fresh calendar when the remembered one was deleted", async () => {
    const g = fakeGoogle({
      "GET https://www.googleapis.com/calendar/v3/calendars/gone": () => json(404),
      "POST https://www.googleapis.com/calendar/v3/calendars": () => json(200, { id: "again" }),
    });
    expect(await ensureCalendar(g.deps, "Stundio", "gone")).toBe("again");
  });

  it("surfaces a refused token as a GoogleAuthError", async () => {
    const g = fakeGoogle({ POST: () => json(401) });
    await expect(ensureCalendar(g.deps, "Stundio", "")).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("fails clearly when Google answers without an id or with an error", async () => {
    await expect(
      ensureCalendar(fakeGoogle({ POST: () => json(200, {}) }).deps, "S", ""),
    ).rejects.toThrow("no calendar id");
    await expect(
      ensureCalendar(fakeGoogle({ POST: () => json(500) }).deps, "S", ""),
    ).rejects.toThrow("Could not create");
  });
});

describe("exportToGoogleCalendar", () => {
  it("imports every lesson by iCalUID into the calendar and counts them", async () => {
    const g = fakeGoogle({
      "POST https://www.googleapis.com/calendar/v3/calendars": (c) =>
        c.url.endsWith("/events/import") ? json(200) : json(200, { id: "cal 1" }),
    });
    const events = Array.from({ length: 12 }, (_, i) => lesson(i));
    const result = await exportToGoogleCalendar(g.deps, events, {
      name: "Stundio",
      calendarId: "",
    });
    expect(result).toEqual({ calendarId: "cal 1", imported: 12, failed: 0 });
    const imports = g.calls.filter((c) => c.url.endsWith("/events/import"));
    expect(imports).toHaveLength(12);
    expect(imports[0]?.url).toContain("/calendars/cal%201/events/import");
    expect(new Set(imports.map((c) => (c.body as { iCalUID: string }).iCalUID)).size).toBe(12);
  });

  it("counts lessons Google refuses without stopping the rest", async () => {
    let n = 0;
    const g = fakeGoogle({
      "POST https://www.googleapis.com/calendar/v3/calendars": (c) =>
        c.url.endsWith("/events/import") ? json(++n === 2 ? 400 : 200) : json(200, { id: "c" }),
    });
    const result = await exportToGoogleCalendar(g.deps, [lesson(1), lesson(2), lesson(3)], {
      name: "S",
      calendarId: "",
    });
    expect(result).toMatchObject({ imported: 2, failed: 1 });
  });

  it("never has more than a handful of requests in flight", async () => {
    let live = 0;
    let peak = 0;
    const fetchFn = vi.fn(async (input: string) => {
      if (!input.endsWith("/events/import")) return json(200, { id: "c" });
      peak = Math.max(peak, ++live);
      await new Promise((r) => setTimeout(r, 1));
      live -= 1;
      return json(200);
    });
    await exportToGoogleCalendar(
      { token: "t", fetch: fetchFn as unknown as typeof fetch },
      Array.from({ length: 20 }, (_, i) => lesson(i)),
      { name: "S", calendarId: "" },
    );
    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBeGreaterThan(1);
  });

  it("stops on a refused token mid-export", async () => {
    const g = fakeGoogle({
      "POST https://www.googleapis.com/calendar/v3/calendars": (c) =>
        c.url.endsWith("/events/import") ? json(403) : json(200, { id: "c" }),
    });
    await expect(
      exportToGoogleCalendar(g.deps, [lesson(1)], { name: "S", calendarId: "" }),
    ).rejects.toBeInstanceOf(GoogleAuthError);
  });
});
