import { describe, expect, it, vi } from "vitest";
import { GOOGLE_IMPORT_URL, googleEventUrl, outlookEventUrl } from "../providers.ts";
import { routeCalendarExport, type CalendarEnvironment } from "../router.ts";
import type { CalendarEvent, CalendarTarget } from "../types.ts";

const ev = (n: number, change: CalendarEvent["change"] = "none"): CalendarEvent => ({
  uid: `${n}@stundio`,
  date: "2026-09-09",
  start: "08:30",
  end: "09:15",
  title: `Lesson ${n}`,
  location: "A-1",
  description: "",
  change,
  sequence: change === "none" ? 0 : 1,
});

const context = {
  name: "RVT 2PT-1",
  range: { from: "2026-09-09", to: "2026-09-15" },
  now: new Date("2026-09-01T00:00:00Z"),
};

const abort = (): Error => Object.assign(new Error("x"), { name: "AbortError" });

const makeEnv = (over: Partial<CalendarEnvironment> = {}) => {
  const env = {
    native: null,
    navigator: null,
    download: vi.fn(),
    openUrl: vi.fn(),
    ...over,
  } satisfies CalendarEnvironment;
  return env;
};

const webNav = (share = vi.fn().mockResolvedValue(undefined)) => ({
  share,
  canShare: vi.fn().mockReturnValue(true),
});

describe("routeCalendarExport", () => {
  it("does nothing for an empty list", async () => {
    const env = makeEnv({ native: vi.fn(), navigator: webNav() });
    for (const t of ["ics", "apple", "google", "outlook"] as CalendarTarget[]) {
      expect(await routeCalendarExport(t, [], context, env)).toEqual({ kind: "nothing-to-export" });
    }
    expect(env.native).not.toHaveBeenCalled();
    expect(env.download).not.toHaveBeenCalled();
    expect(env.openUrl).not.toHaveBeenCalled();
  });

  it.each(["ics", "apple"] as const)("%s prefers native, with the file text", async (t) => {
    const native = vi.fn().mockResolvedValue(undefined);
    const env = makeEnv({ native, navigator: webNav() });
    const out = await routeCalendarExport(t, [ev(1), ev(2)], context, env);
    expect(out).toEqual({ kind: "file", via: "native", eventCount: 2 });
    const payload = native.mock.calls[0]?.[0] as { text: string; fileName: string; title: string };
    expect(payload.text).toContain("BEGIN:VCALENDAR");
    expect(payload.fileName).toMatch(/\.ics$/);
    expect(payload.title).toBe(context.name);
    expect(env.openUrl).not.toHaveBeenCalled();
  });

  it("uses Web Share with a text/calendar file when there is no native", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const env = makeEnv({ navigator: webNav(share) });
    const out = await routeCalendarExport("apple", [ev(1), ev(2)], context, env);
    expect(out).toEqual({ kind: "file", via: "web-share", eventCount: 2 });
    const data = share.mock.calls[0]?.[0] as { files: File[] };
    expect(data.files[0]?.type).toBe("text/calendar");
    expect(env.download).not.toHaveBeenCalled();
  });

  it("downloads when Web Share cannot take files", async () => {
    const nav = { share: vi.fn(), canShare: vi.fn().mockReturnValue(false) };
    const env = makeEnv({ navigator: nav });
    const out = await routeCalendarExport("ics", [ev(1), ev(2)], context, env);
    expect(out).toEqual({ kind: "file", via: "download", eventCount: 2 });
    expect(nav.share).not.toHaveBeenCalled();
    expect(env.download).toHaveBeenCalledOnce();
  });

  it("downloads when navigator is share-less, and throws with no way out", async () => {
    const env = makeEnv({ navigator: {} });
    expect((await routeCalendarExport("ics", [ev(1), ev(2)], context, env)).kind).toBe("file");
    const none = makeEnv({ download: null });
    await expect(routeCalendarExport("ics", [ev(1), ev(2)], context, none)).rejects.toThrow(
      "not supported",
    );
  });

  it("google: delivers the file and hands back the import page instead of opening it", async () => {
    const env = makeEnv({ download: vi.fn() });
    const out = await routeCalendarExport("google", [ev(1), ev(2)], context, env);
    expect(out).toEqual({
      kind: "file",
      via: "download",
      eventCount: 2,
      followUp: GOOGLE_IMPORT_URL,
    });
    // A scripted window.open after an await is popup-blocked, so the UI shows it as a link.
    expect(env.openUrl).not.toHaveBeenCalled();
  });

  it("google and outlook ask Android to open the file in a calendar app, ics/apple do not", async () => {
    for (const [target, view] of [
      ["google", true],
      ["outlook", true],
      ["ics", false],
      ["apple", false],
    ] as const) {
      const native = vi.fn().mockResolvedValue(undefined);
      await routeCalendarExport(target, [ev(1), ev(2)], context, makeEnv({ native }));
      const payload = native.mock.calls[0]?.[0] as { view?: boolean };
      expect(payload.view === true).toBe(view);
    }
  });

  it("google: a cancelled share returns no follow-up link", async () => {
    const env = makeEnv({ native: vi.fn().mockRejectedValue(abort()) });
    expect(await routeCalendarExport("google", [ev(1), ev(2)], context, env)).toEqual({
      kind: "cancelled",
    });
  });

  it("google: a single event opens its deeplink and sends no file", async () => {
    const env = makeEnv();
    const out = await routeCalendarExport("google", [ev(1)], context, env);
    expect(out).toEqual({ kind: "link-opened", eventCount: 1 });
    expect(env.openUrl).toHaveBeenCalledWith(googleEventUrl(ev(1)));
    expect(env.download).not.toHaveBeenCalled();
  });

  it("outlook: file for many, deeplink for one", async () => {
    const env = makeEnv();
    expect((await routeCalendarExport("outlook", [ev(1), ev(2)], context, env)).kind).toBe("file");
    expect(env.openUrl).not.toHaveBeenCalled();
    const single = await routeCalendarExport("outlook", [ev(3)], context, env);
    expect(single).toEqual({ kind: "link-opened", eventCount: 1 });
    expect(env.openUrl).toHaveBeenCalledWith(outlookEventUrl(ev(3)));
  });

  it("a cancelled share resolves as cancelled and skips the import page", async () => {
    const nav = webNav(vi.fn().mockRejectedValue(abort()));
    const env = makeEnv({ navigator: nav });
    expect(await routeCalendarExport("google", [ev(1), ev(2)], context, env)).toEqual({
      kind: "cancelled",
    });
    expect(env.openUrl).not.toHaveBeenCalled();
    const native = makeEnv({ native: vi.fn().mockRejectedValue(abort()) });
    expect(await routeCalendarExport("ics", [ev(1)], context, native)).toEqual({
      kind: "cancelled",
    });
  });

  it("rethrows real failures", async () => {
    const env = makeEnv({ native: vi.fn().mockRejectedValue(new Error("boom")) });
    await expect(routeCalendarExport("ics", [ev(1)], context, env)).rejects.toThrow("boom");
  });

  it("changesOnly filters every target", async () => {
    const events = [ev(1), ev(2, "moved"), ev(3, "cancelled"), ev(4)];
    const env = makeEnv();
    const out = await routeCalendarExport("ics", events, { ...context, changesOnly: true }, env);
    expect(out).toEqual({ kind: "file", via: "download", eventCount: 2 });

    const one = await routeCalendarExport(
      "google",
      [ev(1), ev(2, "added")],
      { ...context, changesOnly: true },
      env,
    );
    expect(one).toEqual({ kind: "link-opened", eventCount: 1 });

    const none = await routeCalendarExport("ics", [ev(1)], { ...context, changesOnly: true }, env);
    expect(none).toEqual({ kind: "nothing-to-export" });
  });
});
