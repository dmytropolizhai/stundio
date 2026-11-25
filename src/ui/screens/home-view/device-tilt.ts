/**
 * Device-motion tilt reader for the Home school tile's fluid surface.
 *
 * Uses `devicemotion`'s `accelerationIncludingGravity` rather than `deviceorientation` Euler
 * angles (`beta`/`gamma`) to avoid gimbal lock when a phone is held upright in a corridor.
 * Automatically flattens toward `0` when the device lies flat on a desk, low-pass filters
 * footsteps, and supports iOS Safari's one-time user-gesture `requestPermission()` flow.
 */

/** Maximum rendered liquid tilt (±28°). */
export const MAX_TILT_RAD = (28 * Math.PI) / 180;

const FLAT_START = 0.22;
const FLAT_RANGE = 0.28;
const LOW_PASS_ALPHA = 0.24;

type PermissionState = "unknown" | "granted" | "denied";

type MotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

let permissionState: PermissionState = "unknown";
const permissionListeners = new Set<() => void>();

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

const getMotionCtor = (): MotionEventWithPermission | null =>
  typeof DeviceMotionEvent === "undefined" ? null : DeviceMotionEvent;

/** True on iOS Safari where `devicemotion` requires an explicit user-gesture permission prompt. */
export const needsMotionPermission = (): boolean => {
  const ctor = getMotionCtor();
  return ctor !== null && typeof ctor.requestPermission === "function";
};

/**
 * Requests iOS `DeviceMotionEvent` permission at most once, caching the result so a user is
 * never prompted again after granting or denying. Must be called inside a user gesture handler.
 */
export const requestMotionPermissionOnce = async (): Promise<boolean> => {
  if (!needsMotionPermission()) return true;
  if (permissionState === "granted") return true;
  if (permissionState === "denied") return false;

  const ctor = getMotionCtor();
  if (ctor?.requestPermission === undefined) return true;

  try {
    const result = await ctor.requestPermission();
    permissionState = result === "granted" ? "granted" : "denied";
  } catch {
    permissionState = "denied";
  }

  for (const listener of permissionListeners) listener();
  return permissionState === "granted";
};

/** Resets cached permission state; intended for tests. */
export const resetMotionPermissionForTest = (): void => {
  permissionState = "unknown";
};

const readScreenOrientationAngle = (): number => {
  if (typeof window === "undefined") return 0;
  const angle = window.screen?.orientation?.angle;
  return typeof angle === "number" ? angle : 0;
};

/**
 * Converts a 3D gravity vector (`accelerationIncludingGravity`) into a clamped screen-plane
 * liquid tilt angle in radians (`[-MAX_TILT_RAD, MAX_TILT_RAD]`).
 *
 * Sign convention: positive angle slopes the canvas surface downward to the right (`dy/dx > 0`,
 * water rising on the left when the phone is tilted counter-clockwise).
 */
export const gravityToTiltAngle = (
  gx: number,
  gy: number,
  gz: number,
  orientationAngle = 0,
  invertAxes = false,
): number => {
  const x = invertAxes ? -gx : gx;
  const y = invertAxes ? -gy : gy;
  const z = invertAxes ? -gz : gz;

  const normalized = (((Math.round(orientationAngle / 90) * 90) % 360) + 360) % 360;
  let sx = x;
  let sy = y;
  if (normalized === 90) {
    sx = -y;
    sy = x;
  } else if (normalized === 180) {
    sx = -x;
    sy = -y;
  } else if (normalized === 270) {
    sx = y;
    sy = -x;
  }

  const total = Math.hypot(sx, sy, z);
  if (total < 1) return 0;

  const planar = Math.hypot(sx, sy);
  const uprightRatio = planar / total;
  const flatFade = clamp((uprightRatio - FLAT_START) / FLAT_RANGE, 0, 1);
  if (flatFade <= 0) return 0;

  const rawAngle = Math.atan2(sx, sy);
  return clamp(rawAngle, -MAX_TILT_RAD, MAX_TILT_RAD) * flatFade;
};

/**
 * Subscribes to filtered device tilt updates while active. Returns an unsubscribe callback
 * that detaches the `devicemotion` listener immediately to save battery when paused or hidden.
 */
export const subscribeDeviceTilt = (onAngle: (angleRad: number) => void): (() => void) => {
  if (typeof window === "undefined" || getMotionCtor() === null) {
    return () => {};
  }

  const iosAxes = needsMotionPermission();
  let attached = false;
  let filtered = 0;

  const onMotion = (event: DeviceMotionEvent) => {
    const g = event.accelerationIncludingGravity;
    if (g === null || g.x === null || g.y === null || g.z === null) return;
    const raw = gravityToTiltAngle(g.x, g.y, g.z, readScreenOrientationAngle(), iosAxes);
    filtered += (raw - filtered) * LOW_PASS_ALPHA;
    onAngle(filtered);
  };

  const attach = () => {
    if (attached) return;
    if (iosAxes && permissionState !== "granted") return;
    attached = true;
    window.addEventListener("devicemotion", onMotion);
  };

  attach();
  permissionListeners.add(attach);

  return () => {
    permissionListeners.delete(attach);
    if (attached) {
      window.removeEventListener("devicemotion", onMotion);
      attached = false;
    }
  };
};
