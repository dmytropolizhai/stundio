import { createElement } from "react";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  gravityToTiltAngle,
  MAX_TILT_RAD,
  requestMotionPermissionOnce,
  resetMotionPermissionForTest,
} from "../screens/home-view/device-tilt.ts";
import { SchoolBackdrop } from "../screens/home-view/school-backdrop.tsx";
import {
  createSchoolFluidState,
  renderSchoolFluidFrame,
  triggerSchoolFluidSlosh,
  visualFluidLevel,
  type SchoolFluidTone,
} from "../screens/home-view/school-fluid-canvas.ts";

const makeMockContext = () => {
  const grad = { addColorStop: vi.fn() };
  const clearRect = vi.fn();
  const stroke = vi.fn();
  const fill = vi.fn();
  const ctx = {
    clearRect,
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill,
    stroke,
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    createLinearGradient: vi.fn(() => grad),
    setTransform: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
  } as unknown as CanvasRenderingContext2D;
  return { ctx, clearRect, stroke, fill };
};

describe("school-fluid-canvas", () => {
  it("maps ongoing progress monotonically and keeps ahead as a calm low pool", () => {
    expect(visualFluidLevel("ongoing", 0)).toBeCloseTo(0.14, 4);
    expect(visualFluidLevel("ongoing", 0.5)).toBeCloseTo(0.54, 4);
    expect(visualFluidLevel("ongoing", 1)).toBeCloseTo(0.94, 4);
    expect(visualFluidLevel("ongoing", 1.5)).toBeCloseTo(0.94, 4);
    expect(visualFluidLevel("ongoing", -0.2)).toBeCloseTo(0.14, 4);
    expect(visualFluidLevel("ahead", 0)).toBeCloseTo(0.12, 4);
    expect(visualFluidLevel("ahead", 0.8)).toBeCloseTo(0.12, 4);
  });

  const tones: SchoolFluidTone[] = ["ongoing", "ahead"];

  it.each(tones)(
    "builds deterministic bubble pools and renders cleanly for %s (animated, slosh, reduced motion)",
    (tone) => {
      const stateA = createSchoolFluidState(tone, 180, 180, 0.35);
      const stateB = createSchoolFluidState(tone, 180, 180, 0.35);
      expect(stateA).toEqual(stateB);
      expect(stateA.bubbles.length).toBeGreaterThanOrEqual(7);

      const { ctx, clearRect, stroke, fill } = makeMockContext();
      triggerSchoolFluidSlosh(stateA, 1, 0.9);
      renderSchoolFluidFrame(ctx, stateA, 0.72, 3.0, 0.05, false);
      expect(stateA.displayFill).toBeGreaterThan(0.35);
      expect(stateA.displayFill).toBeLessThan(0.72);
      expect(stateA.sloshEnergy).toBeLessThan(0.9);

      // Reduced motion snaps directly to target fill and clears slosh
      renderSchoolFluidFrame(ctx, stateA, 0.85, 3.0, 0, true);
      expect(stateA.displayFill).toBeCloseTo(0.85, 5);
      expect(stateA.sloshEnergy).toBe(0);

      expect(clearRect).toHaveBeenCalledTimes(2);
      expect(stroke).toHaveBeenCalledTimes(2);
      expect(fill.mock.calls.length).toBeGreaterThanOrEqual(4);
    },
  );

  it("scales bubble count proportionally on a 2:1 full-row stage", () => {
    const square = createSchoolFluidState("ongoing", 180, 180, 0.5);
    const wide = createSchoolFluidState("ongoing", 360, 180, 0.5);
    expect(wide.bubbles.length).toBeGreaterThan(square.bubbles.length);
  });

  it("springs toward device tilt, couples brisk tilt into slosh, and levels under reduced motion", () => {
    const state = createSchoolFluidState("ongoing", 360, 180, 0.5);
    const { ctx } = makeMockContext();

    // Brisk tilt to +25°
    const target = (25 * Math.PI) / 180;
    renderSchoolFluidFrame(ctx, state, 0.5, 3.0, 0.05, false, target, false);
    expect(state.tiltAngle).toBeGreaterThan(0);
    expect(state.sloshEnergy).toBeGreaterThan(0);

    // Expanding shifts horizontal pivot from left half (25%) toward full stage center (50%)
    const collapsedPivot = state.pivotX;
    renderSchoolFluidFrame(ctx, state, 0.5, 3.1, 0.1, false, target, true);
    expect(state.pivotX).toBeGreaterThan(collapsedPivot);

    // Reduced motion resets tilt and slosh to level
    renderSchoolFluidFrame(ctx, state, 0.5, 3.2, 0, true, target, true);
    expect(state.tiltAngle).toBe(0);
    expect(state.sloshEnergy).toBe(0);
  });
});

describe("device-tilt", () => {
  afterEach(() => {
    resetMotionPermissionForTest();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("maps gravity vectors to clamped ±28° tilt and flattens when lying on a desk", () => {
    // Upright portrait
    expect(gravityToTiltAngle(0, 9.8, 0)).toBeCloseTo(0, 4);
    // Flat on a desk (gravity mostly along Z) -> 0
    expect(gravityToTiltAngle(0.4, 0.4, 9.8)).toBe(0);
    // Counter-clockwise tilt (gx > 0, gy > 0) -> positive angle
    const gentle = gravityToTiltAngle(2.5, 9.5, 0);
    expect(gentle).toBeGreaterThan(0.2);
    expect(gentle).toBeLessThan(MAX_TILT_RAD);
    // Steep tilt clamps to ±28°
    expect(gravityToTiltAngle(9.0, 2.0, 0)).toBeCloseTo(MAX_TILT_RAD, 4);
    expect(gravityToTiltAngle(-9.0, 2.0, 0)).toBeCloseTo(-MAX_TILT_RAD, 4);
    // iOS inverted axes match Android sign when invertAxes=true
    expect(gravityToTiltAngle(-2.5, -9.5, 0, 0, true)).toBeCloseTo(gentle, 4);
    // Rotated 90° screen orientation rotates gravity into screen plane
    expect(gravityToTiltAngle(9.5, -2.5, 0, 90, false)).toBeCloseTo(gentle, 4);
  });

  it("requests iOS DeviceMotionEvent permission at most once and caches the decision", async () => {
    const requestPermission = vi
      .fn<() => Promise<"granted" | "denied">>()
      .mockResolvedValue("granted");
    vi.stubGlobal("DeviceMotionEvent", { requestPermission });

    expect(await requestMotionPermissionOnce()).toBe(true);
    expect(await requestMotionPermissionOnce()).toBe(true);
    expect(requestPermission).toHaveBeenCalledTimes(1);

    resetMotionPermissionForTest();
    requestPermission.mockResolvedValueOnce("denied");
    expect(await requestMotionPermissionOnce()).toBe(false);
    expect(await requestMotionPermissionOnce()).toBe(false);
    expect(requestPermission).toHaveBeenCalledTimes(2);
  });
});

describe("SchoolBackdrop", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("anchors the canvas stage on the left at full row width and preserves state across pause/expand toggles", () => {
    const { ctx } = makeMockContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const { getByTestId, rerender } = render(
      createElement(SchoolBackdrop, {
        tone: "ongoing",
        progress: 0.4,
        expanded: false,
        paused: false,
      }),
    );

    const backdrop = getByTestId("school-backdrop");
    expect(backdrop.getAttribute("data-tone")).toBe("ongoing");
    expect(backdrop.getAttribute("data-fill")).toBe("40");
    expect(backdrop.getAttribute("data-paused")).toBe("false");

    const stage = getByTestId("school-backdrop-stage");
    expect(stage.className).toContain("w-[100cqw]");
    expect(stage.className).toContain("left-0");

    // Advance two frames
    rafCallbacks.shift()?.(1000);
    rafCallbacks.shift()?.(1050);
    const setTransform = (ctx as unknown as { setTransform: ReturnType<typeof vi.fn> })
      .setTransform;
    expect(setTransform).toHaveBeenCalledTimes(1);

    // Expand + tick progress — triggers slosh without recreating canvas state
    rerender(
      createElement(SchoolBackdrop, {
        tone: "ongoing",
        progress: 0.55,
        expanded: true,
        paused: false,
      }),
    );
    expect(getByTestId("school-backdrop").getAttribute("data-fill")).toBe("55");
    rafCallbacks.shift()?.(1100);
    expect(setTransform).toHaveBeenCalledTimes(1);

    // Pause (weather tile expanded) then resume — canvas state is not recreated
    rerender(
      createElement(SchoolBackdrop, {
        tone: "ongoing",
        progress: 0.55,
        expanded: false,
        paused: true,
      }),
    );
    expect(getByTestId("school-backdrop").getAttribute("data-paused")).toBe("true");

    rerender(
      createElement(SchoolBackdrop, {
        tone: "ongoing",
        progress: 0.55,
        expanded: false,
        paused: false,
      }),
    );
    expect(getByTestId("school-backdrop").getAttribute("data-paused")).toBe("false");
    expect(setTransform).toHaveBeenCalledTimes(1);
  });
});
