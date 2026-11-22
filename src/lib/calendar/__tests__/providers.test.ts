import { describe, expect, it } from "vitest";
import { GOOGLE_IMPORT_URL, googleEventUrl, outlookEventUrl } from "../providers.ts";
import type { CalendarEvent } from "../types.ts";

const event: CalendarEvent = {
  uid: "a@stundio",
  date: "2026-09-09",
  start: "08:30",
  end: "09:15",
  title: "Matemātika & ģeometrija",
  location: "A-201",
  description: "Skolotājs: Jānis\nGrupa: 1",
  change: "none",
  sequence: 0,
};

describe("googleEventUrl", () => {
  const url = new URL(googleEventUrl(event));
  it("targets the render endpoint with Riga wall-clock dates", () => {
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20260909T083000/20260909T091500");
    expect(url.searchParams.get("ctz")).toBe("Europe/Riga");
  });
  it("round-trips Latvian text, ampersands and newlines", () => {
    expect(url.searchParams.get("text")).toBe(event.title);
    expect(url.searchParams.get("details")).toBe(event.description);
    expect(url.searchParams.get("location")).toBe("A-201");
    expect(googleEventUrl(event)).not.toContain("ā");
  });
});

describe("outlookEventUrl", () => {
  const url = new URL(outlookEventUrl(event));
  it("builds a compose deeplink", () => {
    expect(url.origin + url.pathname).toBe("https://outlook.live.com/calendar/0/deeplink/compose");
    expect(url.searchParams.get("path")).toBe("/calendar/action/compose");
    expect(url.searchParams.get("rru")).toBe("addevent");
    expect(url.searchParams.get("startdt")).toBe("2026-09-09T08:30:00");
    expect(url.searchParams.get("enddt")).toBe("2026-09-09T09:15:00");
    expect(url.searchParams.get("subject")).toBe(event.title);
    expect(url.searchParams.get("body")).toBe(event.description);
  });
});

it("exposes the Google import page", () => {
  expect(GOOGLE_IMPORT_URL).toBe("https://calendar.google.com/calendar/u/0/r/settings/export");
});
