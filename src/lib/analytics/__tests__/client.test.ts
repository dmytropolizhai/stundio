import { describe, expect, it, vi } from "vitest";
import { createAnalyticsClient, noopAnalytics } from "../client.ts";
import type { HttpClient } from "../http.ts";

describe("createAnalyticsClient", () => {
  it("posts a Plausible event with the event name as both `name` and the synthetic url", () => {
    const http = vi.fn<HttpClient>().mockResolvedValue(undefined);
    const analytics = createAnalyticsClient(http, "stundio.lv");

    analytics.track("view_day");

    expect(http).toHaveBeenCalledWith("https://plausible.io/api/event", {
      domain: "stundio.lv",
      name: "view_day",
      url: "app://stundio.lv/view_day",
    });
  });

  it("never throws when the request fails", () => {
    const http: HttpClient = () => Promise.reject(new Error("offline"));
    const analytics = createAnalyticsClient(http, "stundio.lv");

    expect(() => {
      analytics.track("view_day");
    }).not.toThrow();
  });
});

describe("noopAnalytics", () => {
  it("does nothing", () => {
    expect(() => {
      noopAnalytics.track("anything");
    }).not.toThrow();
  });
});
