/**
 * One-tap Google export through the hook: the token is requested from the tap, lessons go into
 * a "Stundio" calendar over the API, the calendar id is remembered, and a cancelled or refused
 * sign-in leaves the right status. Google's script and API are faked; nothing touches a network.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

vi.hoisted(() => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
});

import { StoreContext } from "@/store";
import { useCalendarExport } from "../calendar/useCalendarExport.ts";
import { bootHarness, type Harness } from "./harness.tsx";

const wrap = (h: Harness) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <StoreContext.Provider value={h.store}>{children}</StoreContext.Provider>
  );
  return Wrapper;
};

type Config = { callback: (r: { access_token?: string; error?: string }) => void };

const fakeGoogleScript = (respond: (c: Config) => void) => {
  (window as unknown as { google: unknown }).google = {
    accounts: {
      oauth2: {
        initTokenClient: (config: Config) => ({ requestAccessToken: () => respond(config) }),
      },
    },
  };
};

/** A `fetch` that answers by URL; the code under test only ever passes URL strings. */
const stubFetch =
  (handler: (url: string) => Response): typeof fetch =>
  (input: unknown) =>
    Promise.resolve(handler(input as string));

const json = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });

describe("useCalendarExport · Google sign-in", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-09T08:00:00Z") });
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    delete (window as unknown as { google?: unknown }).google;
  });

  it("is offered in a browser with a client id", async () => {
    const h = await bootHarness();
    const { result } = renderHook(() => useCalendarExport(), { wrapper: wrap(h) });
    expect(result.current.googleSignIn).toBe(true);
  });

  it("adds the week to a new calendar and remembers its id", async () => {
    fakeGoogleScript((c) => c.callback({ access_token: "tok" }));
    const requests: string[] = [];
    globalThis.fetch = stubFetch((url) => {
      requests.push(url);
      return url.endsWith("/events/import") ? json(200) : json(200, { id: "cal-1" });
    });

    const h = await bootHarness();
    const { result } = renderHook(() => useCalendarExport(), { wrapper: wrap(h) });
    await act(() => result.current.exportTo("google"));

    expect(result.current.status).toBe("done");
    expect(result.current.lastOutcome).toMatchObject({ kind: "google-api", calendarId: "cal-1" });
    expect(result.current.eventCount).toBeGreaterThan(0);
    expect(requests[0]).toBe("https://www.googleapis.com/calendar/v3/calendars");
    expect(h.store.getState().settings.googleCalendarId).toBe("cal-1");
  });

  it("keeps the same calendar on the next export", async () => {
    fakeGoogleScript((c) => c.callback({ access_token: "tok" }));
    const requests: string[] = [];
    globalThis.fetch = stubFetch((url) => {
      requests.push(url);
      return json(200);
    });

    const h = await bootHarness({ googleCalendarId: "cal-9" });
    const { result } = renderHook(() => useCalendarExport(), { wrapper: wrap(h) });
    await act(() => result.current.exportTo("google"));

    expect(requests[0]).toBe("https://www.googleapis.com/calendar/v3/calendars/cal-9");
    expect(requests.some((u) => u.includes("/calendars/cal-9/events/import"))).toBe(true);
    expect(h.store.getState().settings.googleCalendarId).toBe("cal-9");
  });

  it("goes back to idle when the student closes the Google popup", async () => {
    fakeGoogleScript((c) => c.callback({ error: "access_denied" }));
    const h = await bootHarness();
    const { result } = renderHook(() => useCalendarExport(), { wrapper: wrap(h) });
    await act(() => result.current.exportTo("google"));
    expect(result.current.status).toBe("idle");
  });

  it("asks the student to allow access again when Google refuses the token", async () => {
    fakeGoogleScript((c) => c.callback({ access_token: "tok" }));
    globalThis.fetch = stubFetch(() => json(403));
    const h = await bootHarness();
    const { result } = renderHook(() => useCalendarExport(), { wrapper: wrap(h) });
    await act(() => result.current.exportTo("google"));
    expect(result.current.status).toBe("signInError");
  });

  it("reports an error when Google accepts no lesson at all", async () => {
    fakeGoogleScript((c) => c.callback({ access_token: "tok" }));
    globalThis.fetch = stubFetch((url) =>
      url.endsWith("/events/import") ? json(400) : json(200, { id: "c" }),
    );
    const h = await bootHarness();
    const { result } = renderHook(() => useCalendarExport(), { wrapper: wrap(h) });
    await act(() => result.current.exportTo("google"));
    expect(result.current.status).toBe("error");
    expect(result.current.failedCount).toBeGreaterThan(0);
  });

  it("falls back to the file route when Google's script has not loaded", async () => {
    const h = await bootHarness();
    const { result } = renderHook(() => useCalendarExport(), { wrapper: wrap(h) });
    // No window.google: the file route runs (and has no share/download here, so it errors) —
    // what matters is that no Google API call is attempted.
    globalThis.fetch = vi.fn();
    await act(() => result.current.exportTo("google"));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
