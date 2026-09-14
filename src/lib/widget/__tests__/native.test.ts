/**
 * The Capacitor edge of the widget layer. Capacitor is mocked — what matters is that the
 * payload crosses the bridge as one JSON string, and that nothing is attempted on a platform
 * with no home screen to draw on.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WIDGET_PAYLOAD_VERSION, type WidgetPayload } from "../types.ts";

const state = vi.hoisted(() => ({ platform: "web", publish: vi.fn() }));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => state.platform },
  registerPlugin: () => ({ publish: state.publish }),
}));

const { nativeWidget } = await import("../native.ts");

const PAYLOAD: WidgetPayload = {
  version: WIDGET_PAYLOAD_VERSION,
  updatedAt: "2026-09-09T05:00:00.000Z",
  date: "2026-09-09",
  state: "live",
  label: "Now",
  title: "Mat",
  subtitle: "08:30–09:10 · 210 · A1-1",
  countdown: "12 min left",
  accent: "#14C030",
  minutesUntilChange: 12,
};

beforeEach(() => {
  state.platform = "web";
  state.publish.mockReset();
  state.publish.mockResolvedValue(undefined);
});

describe("nativeWidget", () => {
  it("hands the StundioWidget plugin one serialized payload", async () => {
    state.platform = "android";

    await nativeWidget()?.(PAYLOAD);

    expect(state.publish).toHaveBeenCalledWith({ payload: JSON.stringify(PAYLOAD) });
  });

  it("is absent everywhere else — a browser has no widget host", () => {
    expect(nativeWidget()).toBeNull();
  });
});
