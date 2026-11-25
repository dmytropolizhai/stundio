/**
 * Photorealistic 2D Canvas atmospheric renderer for the Home weather tile.
 *
 * Pre-renders procedural fBm (fractal Brownian motion) volumetric cloud, fog, and frost
 * textures onto small offscreen canvases once per scene/resize, then composites them at
 * 60 fps alongside Mie-scattered sunlight & lens bokeh, shaded crescent moon & multi-temp
 * starfield, tapered motion-blurred rain with splashes, depth-of-field snow bokeh, and
 * cloud-illuminating forked lightning.
 */
import type { WeatherScene, WeatherSky } from "@/lib/weather";

type Star = {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  speed: number;
  phase: number;
  rgb: string;
  sparkle: boolean;
};

type CloudInstance = {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  alpha: number;
  spriteIdx: number;
};

type FogInstance = {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  amp: number;
  phase: number;
  alpha: number;
  spriteIdx: number;
};

type IceDust = {
  x: number;
  y: number;
  r: number;
  speedX: number;
  speedY: number;
  phase: number;
  twinkleSpeed: number;
};

type RainStreak = {
  x: number;
  y: number;
  len: number;
  width: number;
  speed: number;
  alpha: number;
  slant: number;
  bokeh: boolean;
};

type SnowFlake = {
  x: number;
  y: number;
  r: number;
  speed: number;
  swayAmp1: number;
  swaySpeed1: number;
  swayAmp2: number;
  swaySpeed2: number;
  phase: number;
  drift: number;
  alpha: number;
  bokeh: boolean;
};

type Splash = { x: number; phase: number; period: number; maxR: number };

type BoltPoint = { x: number; y: number };
type LightningBolt = {
  main: readonly BoltPoint[];
  branches: readonly (readonly BoltPoint[])[];
};

export type WeatherCanvasState = {
  scene: WeatherScene;
  width: number;
  height: number;
  stars: readonly Star[];
  cloudSprites: readonly HTMLCanvasElement[];
  clouds: readonly CloudInstance[];
  fogSprites: readonly HTMLCanvasElement[];
  fog: readonly FogInstance[];
  frostSprite: HTMLCanvasElement | null;
  iceDust: readonly IceDust[];
  rain: readonly RainStreak[];
  snow: readonly SnowFlake[];
  splashes: readonly Splash[];
  bolt: LightningBolt | null;
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const seedForScene = (scene: WeatherScene): number => {
  const key = `${scene.sky}:${scene.precip}:${scene.celestial}:${scene.clouds}:${String(scene.flash)}:${String(scene.frost)}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const isLightSky = (sky: WeatherSky): boolean =>
  sky === "clear-day" || sky === "partly-cloudy-day" || sky === "fog-day";

const hash2D = (ix: number, iy: number, seed: number): number => {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

const valueNoise2D = (x: number, y: number, seed: number): number => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2D(ix, iy, seed);
  const b = hash2D(ix + 1, iy, seed);
  const c = hash2D(ix, iy + 1, seed);
  const d = hash2D(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};

const fbm2D = (x: number, y: number, seed: number, octaves = 4): number => {
  let value = 0;
  let amp = 0.52;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    value += valueNoise2D(x * freq, y * freq, seed + i * 31) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.04;
  }
  return value / norm;
};

const createOffscreenCanvas = (
  w: number,
  h: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    return null;
  }
  if (ctx === null || typeof ctx.createImageData !== "function") return null;
  return { canvas, ctx };
};

type CloudPalette = {
  hi: readonly [number, number, number];
  mid: readonly [number, number, number];
  lo: readonly [number, number, number];
};

const cloudPaletteFor = (sky: WeatherSky, precip: WeatherScene["precip"]): CloudPalette => {
  if (sky === "clear-day" || sky === "partly-cloudy-day") {
    return { hi: [255, 253, 248], mid: [228, 236, 248], lo: [162, 180, 208] };
  }
  if (sky === "partly-cloudy-night") {
    return { hi: [176, 192, 224], mid: [96, 110, 140], lo: [34, 42, 62] };
  }
  if (sky === "storm") {
    return { hi: [102, 112, 134], mid: [52, 58, 74], lo: [20, 24, 34] };
  }
  if (sky === "cloudy-night") {
    return { hi: [118, 128, 148], mid: [66, 74, 90], lo: [28, 34, 44] };
  }
  if (sky === "cold") {
    return { hi: [222, 236, 250], mid: [148, 174, 206], lo: [74, 102, 138] };
  }
  if (precip !== "none") {
    return { hi: [178, 190, 208], mid: [110, 122, 142], lo: [56, 66, 84] };
  }
  return { hi: [218, 226, 238], mid: [146, 158, 178], lo: [82, 92, 112] };
};

/**
 * Generates a soft volumetric cloud texture using 4-octave fBm noise shaped by a natural
 * cumulus/stratus dome with directional top-right lighting and self-shadowed underbelly.
 */
const buildCloudSprite = (
  seed: number,
  palette: CloudPalette,
  stratus: boolean,
): HTMLCanvasElement | null => {
  const w = 128;
  const h = 68;
  const off = createOffscreenCanvas(w, h);
  if (off === null) return null;

  const img = off.ctx.createImageData(w, h);
  const data = img.data;
  const scaleX = stratus ? 3.4 : 4.2;
  const scaleY = stratus ? 2.8 : 3.4;

  for (let py = 0; py < h; py++) {
    const ny = (py / (h - 1)) * 2 - 1; // -1 top .. +1 bottom
    for (let px = 0; px < w; px++) {
      const nx = (px / (w - 1)) * 2 - 1; // -1 left .. +1 right

      // Natural billowing silhouette: flatter base, rounded upper lobes
      const baseStretch = ny > 0 ? 1.35 : 0.92;
      const lobe = Math.sin(nx * 2.4 + seed) * 0.14;
      const distSq =
        nx * nx * (stratus ? 0.85 : 1.05) + (ny + lobe) * (ny + lobe) * baseStretch * baseStretch;
      const mask = Math.max(0, 1 - distSq);
      if (mask <= 0) continue;

      const n = fbm2D((px / w) * scaleX + 1.3, (py / h) * scaleY + 2.1, seed, 4);
      const density = Math.max(0, Math.min(1, (mask * 1.35 + (n - 0.44) * 1.15 - 0.28) * 1.85));
      if (density <= 0.01) continue;

      // Directional lighting: upper-right sun/moon illuminates top ridges; bottom self-shadows
      const heightShade = 1 - (ny + 1) * 0.5; // 1 at top, 0 at bottom
      const rightBias = (nx + 1) * 0.2;
      const lit = Math.max(0, Math.min(1, heightShade * 0.72 + n * 0.34 + rightBias - 0.16));

      let r: number;
      let g: number;
      let b: number;
      if (lit > 0.55) {
        const k = (lit - 0.55) / 0.45;
        r = palette.mid[0] + (palette.hi[0] - palette.mid[0]) * k;
        g = palette.mid[1] + (palette.hi[1] - palette.mid[1]) * k;
        b = palette.mid[2] + (palette.hi[2] - palette.mid[2]) * k;
      } else {
        const k = lit / 0.55;
        r = palette.lo[0] + (palette.mid[0] - palette.lo[0]) * k;
        g = palette.lo[1] + (palette.mid[1] - palette.lo[1]) * k;
        b = palette.lo[2] + (palette.mid[2] - palette.lo[2]) * k;
      }

      const idx = (py * w + px) * 4;
      data[idx] = Math.round(r);
      data[idx + 1] = Math.round(g);
      data[idx + 2] = Math.round(b);
      data[idx + 3] = Math.round(density * density * 235);
    }
  }

  off.ctx.putImageData(img, 0, 0);
  return off.canvas;
};

/** Generates a soft horizontal rolling fog/mist texture via stretched fBm noise. */
const buildFogSprite = (seed: number, isDay: boolean): HTMLCanvasElement | null => {
  const w = 144;
  const h = 56;
  const off = createOffscreenCanvas(w, h);
  if (off === null) return null;

  const img = off.ctx.createImageData(w, h);
  const data = img.data;
  const rCol = isDay ? 250 : 196;
  const gCol = isDay ? 252 : 208;
  const bCol = isDay ? 255 : 226;

  for (let py = 0; py < h; py++) {
    const ny = (py / (h - 1)) * 2 - 1;
    const vFade = Math.max(0, 1 - ny * ny);
    for (let px = 0; px < w; px++) {
      const nx = (px / (w - 1)) * 2 - 1;
      const hFade = Math.max(0, 1 - nx * nx * 0.72);
      const n = fbm2D((px / w) * 3.2, (py / h) * 2.2, seed, 3);
      const alpha = Math.max(0, Math.min(1, vFade * vFade * hFade * (0.35 + n * 0.95)));
      const idx = (py * w + px) * 4;
      data[idx] = rCol;
      data[idx + 1] = gCol;
      data[idx + 2] = bCol;
      data[idx + 3] = Math.round(alpha * 175);
    }
  }

  off.ctx.putImageData(img, 0, 0);
  return off.canvas;
};

/** Generates a delicate crystalline rime/frost vignette hugging the upper-right rim. */
const buildFrostSprite = (seed: number): HTMLCanvasElement | null => {
  const w = 112;
  const h = 112;
  const off = createOffscreenCanvas(w, h);
  if (off === null) return null;

  const img = off.ctx.createImageData(w, h);
  const data = img.data;
  for (let py = 0; py < h; py++) {
    const ty = py / (h - 1);
    for (let px = 0; px < w; px++) {
      const tx = px / (w - 1);
      // Concentrate rime along top and right edges, leaving bottom-left numeral clean
      const cornerDist = Math.hypot(1 - tx, ty);
      const edgeProx = Math.max(0, 1 - cornerDist * 1.18);
      if (edgeProx <= 0) continue;

      const fine = fbm2D(tx * 11, ty * 11, seed, 4);
      const crystal = Math.max(0, (fine - 0.36) * 2.1);
      const alpha = Math.min(1, edgeProx * edgeProx * (0.28 + crystal * 0.9));
      const idx = (py * w + px) * 4;
      data[idx] = 226;
      data[idx + 1] = 244;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(alpha * 165);
    }
  }

  off.ctx.putImageData(img, 0, 0);
  return off.canvas;
};

const buildLightningBolt = (w: number, h: number, rand: () => number): LightningBolt => {
  const main: BoltPoint[] = [];
  let x = w * 0.72;
  let y = h * 0.04;
  main.push({ x, y });
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    x += (rand() - 0.58) * w * 0.14;
    y += (h * 0.44) / steps;
    main.push({ x, y });
  }

  const branches: BoltPoint[][] = [];
  for (const idx of [2, 4]) {
    const origin = main[idx];
    if (origin === undefined) continue;
    const dir = idx === 2 ? -1 : 1;
    const b1: BoltPoint = {
      x: origin.x + dir * w * (0.05 + rand() * 0.04),
      y: origin.y + h * (0.06 + rand() * 0.04),
    };
    const b2: BoltPoint = {
      x: b1.x + dir * w * (0.04 + rand() * 0.04),
      y: b1.y + h * (0.05 + rand() * 0.03),
    };
    branches.push([origin, b1, b2]);
  }
  return { main, branches };
};

const STAR_TINTS = ["240, 245, 255", "220, 234, 255", "255, 244, 224", "232, 238, 255"] as const;

export const createWeatherCanvasState = (
  scene: WeatherScene,
  width: number,
  height: number,
): WeatherCanvasState => {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const seed = seedForScene(scene);
  const rand = mulberry32(seed);
  const areaScale = Math.min(1.6, Math.max(0.75, (w * h) / (170 * 170)));

  const stars: Star[] = [];
  if (scene.celestial === "moon") {
    const count = Math.round(30 * areaScale);
    for (let i = 0; i < count; i++) {
      const bright = i < 4;
      stars.push({
        x: rand() * w,
        y: rand() * h * 0.8,
        r: bright ? 1.2 + rand() * 0.55 : 0.45 + rand() * 0.85,
        baseAlpha: bright ? 0.72 + rand() * 0.25 : 0.24 + rand() * 0.54,
        speed: 0.8 + rand() * 2.1,
        phase: rand() * Math.PI * 2,
        rgb: STAR_TINTS[i % STAR_TINTS.length] ?? STAR_TINTS[0],
        sparkle: bright,
      });
    }
  }

  const cloudSprites: HTMLCanvasElement[] = [];
  const clouds: CloudInstance[] = [];
  if (scene.clouds === "few" || scene.clouds === "overcast") {
    const stratus = scene.clouds === "overcast";
    const palette = cloudPaletteFor(scene.sky, scene.precip);
    for (let s = 0; s < 3; s++) {
      const sprite = buildCloudSprite(seed + s * 97, palette, stratus);
      if (sprite !== null) cloudSprites.push(sprite);
    }

    const count = scene.clouds === "few" ? 3 : 6;
    for (let i = 0; i < count; i++) {
      const depth = i / Math.max(1, count - 1);
      const cw = w * (scene.clouds === "few" ? 0.58 + depth * 0.24 : 0.78 + depth * 0.36);
      const ch = cw * (stratus ? 0.5 : 0.56);
      clouds.push({
        x: (i / count) * (w + cw) - cw * 0.5 + rand() * 22,
        y:
          scene.clouds === "few"
            ? h * (0.08 + i * 0.15 + rand() * 0.05)
            : h * (-0.06 + (i % 3) * 0.16 + rand() * 0.06),
        w: cw,
        h: ch,
        speed: (scene.clouds === "few" ? 3.2 : 4.2) + depth * 5.2 + rand() * 1.8,
        alpha: scene.clouds === "few" ? 0.62 + depth * 0.28 : 0.52 + depth * 0.36,
        spriteIdx: i % Math.max(1, cloudSprites.length),
      });
    }
  }

  const fogSprites: HTMLCanvasElement[] = [];
  const fog: FogInstance[] = [];
  if (scene.clouds === "fog") {
    const isDay = scene.sky === "fog-day";
    for (let s = 0; s < 2; s++) {
      const sprite = buildFogSprite(seed + s * 53, isDay);
      if (sprite !== null) fogSprites.push(sprite);
    }
    for (let i = 0; i < 4; i++) {
      const fw = w * (1.3 + i * 0.15);
      const fh = h * (0.34 + i * 0.05);
      fog.push({
        x: i * w * 0.35 - w * 0.2,
        y: h * (0.08 + i * 0.2),
        w: fw,
        h: fh,
        speed: (i % 2 === 0 ? 1 : -1) * (3.5 + i * 1.8),
        amp: 4 + i * 2.5,
        phase: rand() * Math.PI * 2,
        alpha: 0.52 + i * 0.1,
        spriteIdx: i % Math.max(1, fogSprites.length),
      });
    }
  }

  const frostSprite = scene.frost ? buildFrostSprite(seed + 409) : null;
  const iceDust: IceDust[] = [];
  if (scene.frost) {
    const count = Math.round(16 * areaScale);
    for (let i = 0; i < count; i++) {
      iceDust.push({
        x: rand() * w,
        y: rand() * h * 0.85,
        r: 0.7 + rand() * 1.1,
        speedX: 2.2 + rand() * 3.5,
        speedY: 3.5 + rand() * 5,
        phase: rand() * Math.PI * 2,
        twinkleSpeed: 1.4 + rand() * 2.2,
      });
    }
  }

  const rain: RainStreak[] = [];
  const splashes: Splash[] = [];
  if (scene.precip === "rain" || scene.precip === "drizzle") {
    const isDrizzle = scene.precip === "drizzle";
    const baseCount = isDrizzle ? 26 : scene.flash ? 56 : 44;
    const count = Math.round(baseCount * areaScale);
    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      const depth = layer / 2;
      const bokeh = !isDrizzle && layer === 2 && i % 9 === 2;
      rain.push({
        x: rand() * (w + 70) - 25,
        y: rand() * h,
        len: isDrizzle
          ? 7 + depth * 6 + rand() * 3
          : bokeh
            ? 24 + rand() * 12
            : 12 + depth * 15 + rand() * 6,
        width: isDrizzle ? 0.65 + depth * 0.45 : bokeh ? 2.1 : 0.75 + depth * 0.8,
        speed: isDrizzle ? 115 + depth * 75 + rand() * 25 : 220 + depth * 235 + rand() * 65,
        alpha: isDrizzle ? 0.18 + depth * 0.28 : bokeh ? 0.24 : 0.2 + depth * 0.44,
        slant: isDrizzle ? 0.14 : scene.flash ? 0.28 : 0.21,
        bokeh,
      });
    }
    if (!isDrizzle) {
      const splashCount = Math.round(8 * areaScale);
      for (let i = 0; i < splashCount; i++) {
        splashes.push({
          x: w * (0.1 + rand() * 0.82),
          phase: rand(),
          period: 0.48 + rand() * 0.52,
          maxR: 3.5 + rand() * 3.8,
        });
      }
    }
  }

  const snow: SnowFlake[] = [];
  if (scene.precip === "snow") {
    const count = Math.round(42 * areaScale);
    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      const depth = layer / 2;
      const bokeh = i < 4;
      snow.push({
        x: rand() * w,
        y: rand() * h,
        r: bokeh ? 4.4 + rand() * 2.4 : 0.9 + depth * 2.1 + rand() * 0.7,
        speed: bokeh ? 46 + rand() * 16 : 16 + depth * 30 + rand() * 9,
        swayAmp1: bokeh ? 14 + rand() * 8 : 5 + depth * 9 + rand() * 4,
        swaySpeed1: 0.55 + rand() * 0.9,
        swayAmp2: 2.5 + rand() * 3.5,
        swaySpeed2: 1.4 + rand() * 1.4,
        phase: rand() * Math.PI * 2,
        drift: 3.5 + depth * 7.5,
        alpha: bokeh ? 0.34 + rand() * 0.16 : 0.36 + depth * 0.52,
        bokeh,
      });
    }
  }

  const bolt = scene.flash ? buildLightningBolt(w, h, rand) : null;

  return {
    scene,
    width: w,
    height: h,
    stars,
    cloudSprites,
    clouds,
    fogSprites,
    fog,
    frostSprite,
    iceDust,
    rain,
    snow,
    splashes,
    bolt,
  };
};

const stormFlashIntensity = (t: number, reducedMotion: boolean): number => {
  if (reducedMotion) return 0;
  const cycle = 6.8;
  const local = t % cycle;
  if (local >= 5.15 && local <= 5.34) {
    const p = (local - 5.15) / 0.19;
    return Math.sin(p * Math.PI) * 0.95;
  }
  if (local >= 5.4 && local <= 5.56) {
    const p = (local - 5.4) / 0.16;
    return Math.sin(p * Math.PI) * 0.62;
  }
  return 0;
};

/** Subtle atmospheric Rayleigh horizon haze so the sky feels deep rather than flat. */
const drawHorizonAtmosphere = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sky: WeatherSky,
) => {
  const haze = ctx.createLinearGradient(0, h * 0.55, 0, h);
  if (sky === "clear-day" || sky === "partly-cloudy-day") {
    haze.addColorStop(0, "rgba(255, 248, 232, 0)");
    haze.addColorStop(1, "rgba(255, 244, 218, 0.24)");
  } else if (sky === "clear-night" || sky === "partly-cloudy-night") {
    haze.addColorStop(0, "rgba(110, 134, 186, 0)");
    haze.addColorStop(1, "rgba(96, 120, 174, 0.16)");
  } else if (sky === "cold") {
    haze.addColorStop(0, "rgba(182, 224, 248, 0)");
    haze.addColorStop(1, "rgba(162, 212, 242, 0.14)");
  } else {
    return;
  }
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
};

const drawSun = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, cold: boolean) => {
  const cx = w * 0.84;
  const cy = h * 0.16;
  const unit = Math.min(w, h);
  const pulse = 1 + Math.sin(t * 0.7) * 0.045;

  // Broad Mie atmospheric scattering bloom pouring from upper-right
  const outerR = unit * 1.05 * pulse;
  const outer = ctx.createRadialGradient(cx, cy, unit * 0.04, cx, cy, outerR);
  if (cold) {
    outer.addColorStop(0, "rgba(255, 250, 236, 0.68)");
    outer.addColorStop(0.22, "rgba(232, 244, 255, 0.34)");
    outer.addColorStop(0.55, "rgba(196, 226, 252, 0.12)");
    outer.addColorStop(1, "rgba(196, 226, 252, 0)");
  } else {
    outer.addColorStop(0, "rgba(255, 251, 232, 0.94)");
    outer.addColorStop(0.18, "rgba(255, 230, 172, 0.62)");
    outer.addColorStop(0.45, "rgba(246, 198, 126, 0.24)");
    outer.addColorStop(0.78, "rgba(242, 181, 107, 0.06)");
    outer.addColorStop(1, "rgba(242, 181, 107, 0)");
  }
  ctx.fillStyle = outer;
  ctx.fillRect(0, 0, w, h);

  // Soft crepuscular light shafts fanning from the sun
  const angles = [-0.72, -0.44, -0.18];
  for (let i = 0; i < angles.length; i++) {
    const baseAngle = angles[i]!;
    const sway = Math.sin(t * 0.32 + i * 1.7) * 0.035;
    const beamAlpha = (cold ? 0.07 : 0.1) + Math.sin(t * 0.5 + i * 2.1) * 0.025;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(baseAngle + sway);
    const beam = ctx.createLinearGradient(0, 0, -unit * 0.95, 0);
    beam.addColorStop(0, `rgba(255, 248, 226, ${beamAlpha.toFixed(3)})`);
    beam.addColorStop(0.6, `rgba(255, 244, 212, ${(beamAlpha * 0.35).toFixed(3)})`);
    beam.addColorStop(1, "rgba(255, 244, 212, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, -unit * 0.04);
    ctx.lineTo(-unit * 0.95, -unit * 0.16);
    ctx.lineTo(-unit * 0.95, unit * 0.16);
    ctx.lineTo(0, unit * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Luminous solar core
  const coreR = unit * 0.16;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  core.addColorStop(0, "rgba(255, 255, 248, 1)");
  core.addColorStop(0.55, "rgba(255, 244, 206, 0.85)");
  core.addColorStop(1, "rgba(255, 230, 170, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Delicate optical lens-flare bokeh along diagonal axis
  if (!cold) {
    const flareX = w * 0.56;
    const flareY = h * 0.44;
    const flareR = unit * 0.085;
    const flare = ctx.createRadialGradient(flareX, flareY, flareR * 0.4, flareX, flareY, flareR);
    flare.addColorStop(0, "rgba(255, 246, 220, 0.02)");
    flare.addColorStop(0.75, "rgba(255, 236, 194, 0.11)");
    flare.addColorStop(1, "rgba(255, 236, 194, 0)");
    ctx.fillStyle = flare;
    ctx.beginPath();
    ctx.arc(flareX, flareY, flareR, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawMoonAndStars = (
  ctx: CanvasRenderingContext2D,
  state: WeatherCanvasState,
  t: number,
  reducedMotion: boolean,
) => {
  const { width: w, height: h, stars } = state;

  // Faint atmospheric airglow / Milky Way wash across upper diagonal
  ctx.save();
  ctx.translate(w * 0.45, h * 0.32);
  ctx.rotate(-0.42);
  const band = ctx.createLinearGradient(0, -h * 0.22, 0, h * 0.22);
  band.addColorStop(0, "rgba(150, 172, 224, 0)");
  band.addColorStop(0.5, "rgba(150, 172, 224, 0.075)");
  band.addColorStop(1, "rgba(150, 172, 224, 0)");
  ctx.fillStyle = band;
  ctx.fillRect(-w * 0.9, -h * 0.22, w * 1.8, h * 0.44);
  ctx.restore();

  // Multi-temperature twinkling starfield
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i]!;
    const twinkle = 0.58 + 0.42 * Math.sin(t * s.speed + s.phase);
    const alpha = s.baseAlpha * twinkle;
    ctx.fillStyle = `rgba(${s.rgb}, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();

    // Subtle 4-point diffraction spikes on brightest stars
    if (s.sparkle && alpha > 0.55) {
      const spike = s.r * 3.2;
      ctx.strokeStyle = `rgba(${s.rgb}, ${(alpha * 0.38).toFixed(3)})`;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(s.x - spike, s.y);
      ctx.lineTo(s.x + spike, s.y);
      ctx.moveTo(s.x, s.y - spike);
      ctx.lineTo(s.x, s.y + spike);
      ctx.stroke();
    }
  }

  // Occasional delicate shooting star (every ~9.5s, never under reduced motion)
  if (!reducedMotion) {
    const cycle = t % 9.5;
    if (cycle > 7.4 && cycle < 7.95) {
      const p = (cycle - 7.4) / 0.55;
      const sx = w * (0.28 + p * 0.36);
      const sy = h * (0.1 + p * 0.22);
      const tailX = sx - w * 0.14;
      const tailY = sy - h * 0.085;
      const alpha = Math.sin(p * Math.PI) * 0.72;
      const grad = ctx.createLinearGradient(tailX, tailY, sx, sy);
      grad.addColorStop(0, "rgba(235, 244, 255, 0)");
      grad.addColorStop(1, `rgba(248, 252, 255, ${alpha.toFixed(3)})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.1;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
  }

  // Lunar atmospheric scattering halo
  const cx = w * 0.78;
  const cy = h * 0.22;
  const unit = Math.min(w, h);
  const haloR = unit * 0.58 * (1 + Math.sin(t * 0.5) * 0.03);
  const halo = ctx.createRadialGradient(cx, cy, unit * 0.06, cx, cy, haloR);
  halo.addColorStop(0, "rgba(224, 236, 255, 0.34)");
  halo.addColorStop(0.35, "rgba(176, 198, 242, 0.12)");
  halo.addColorStop(1, "rgba(176, 198, 242, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
  ctx.fill();

  const r = unit * 0.11;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.34);

  // Faint earthshine on the dark lunar disc
  ctx.fillStyle = "rgba(164, 182, 218, 0.09)";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
  ctx.fill();

  // Lit crescent limb with subtle lunar mare texture clipped inside
  ctx.beginPath();
  ctx.arc(0, 0, r, 0.22 * Math.PI, 1.78 * Math.PI, false);
  ctx.arc(r * 0.44, 0, r * 0.84, 1.62 * Math.PI, 0.38 * Math.PI, true);
  ctx.closePath();

  const moonGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.2, r * 0.1, 0, 0, r * 1.1);
  moonGrad.addColorStop(0, "rgba(252, 250, 244, 0.98)");
  moonGrad.addColorStop(0.75, "rgba(226, 232, 244, 0.92)");
  moonGrad.addColorStop(1, "rgba(196, 206, 226, 0.84)");
  ctx.fillStyle = moonGrad;
  ctx.fill();

  ctx.clip();
  ctx.fillStyle = "rgba(142, 152, 174, 0.18)";
  ctx.beginPath();
  ctx.arc(-r * 0.45, -r * 0.25, r * 0.26, 0, Math.PI * 2);
  ctx.arc(-r * 0.55, r * 0.3, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawClouds = (
  ctx: CanvasRenderingContext2D,
  state: WeatherCanvasState,
  t: number,
  flash: number,
) => {
  const { width: w, clouds, cloudSprites } = state;
  if (cloudSprites.length === 0) return;

  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i]!;
    const sprite = cloudSprites[c.spriteIdx];
    if (sprite === undefined) continue;

    const span = w + c.w * 1.35;
    const x = ((((c.x + t * c.speed) % span) + span) % span) - c.w * 0.95;
    const y = c.y + Math.sin(t * 0.32 + i * 1.3) * 2.2;

    ctx.save();
    ctx.globalAlpha = c.alpha;
    ctx.drawImage(sprite, x, y, c.w, c.h);

    // Internal cloud-deck illumination during thunderstorm flash
    if (flash > 0.05 && i >= clouds.length - 3) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = flash * 0.42;
      ctx.drawImage(sprite, x, y, c.w, c.h);
    }
    ctx.restore();
  }
};

const drawFog = (ctx: CanvasRenderingContext2D, state: WeatherCanvasState, t: number) => {
  const { width: w, fog, fogSprites } = state;
  if (fogSprites.length === 0) return;

  for (let i = 0; i < fog.length; i++) {
    const f = fog[i]!;
    const sprite = fogSprites[f.spriteIdx];
    if (sprite === undefined) continue;

    const span = w + f.w * 0.8;
    const x = ((((f.x + t * f.speed) % span) + span) % span) - f.w * 0.55;
    const y = f.y + Math.sin(t * 0.3 + f.phase) * f.amp;

    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.drawImage(sprite, x, y, f.w, f.h);
    ctx.restore();
  }
};

const drawFrost = (ctx: CanvasRenderingContext2D, state: WeatherCanvasState, t: number) => {
  const { width: w, height: h, frostSprite, iceDust } = state;

  if (frostSprite !== null) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(frostSprite, 0, 0, w, h);
    ctx.restore();
  }

  // Floating diamond-dust ice crystals catching light in freezing air
  for (let i = 0; i < iceDust.length; i++) {
    const d = iceDust[i]!;
    const x = (((d.x + t * d.speedX) % w) + w) % w;
    const y = (((d.y + t * d.speedY) % h) + h) % h;
    const shimmer = Math.pow(0.5 + 0.5 * Math.sin(t * d.twinkleSpeed + d.phase), 3);
    const alpha = 0.14 + shimmer * 0.72;
    ctx.fillStyle = `rgba(232, 248, 255, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawRain = (
  ctx: CanvasRenderingContext2D,
  state: WeatherCanvasState,
  t: number,
  flash: number,
) => {
  const { width: w, height: h, rain, splashes, scene } = state;
  const darkDrops = scene.sky === "fog-day";
  const rgb = darkDrops ? "36, 56, 86" : "232, 242, 255";

  ctx.lineCap = "round";
  for (let i = 0; i < rain.length; i++) {
    const d = rain[i]!;
    const travel = h + d.len * 2;
    const y = ((((d.y + t * d.speed) % travel) + travel) % travel) - d.len;
    const xShift = t * d.speed * d.slant;
    const wrapW = w + 70;
    const x = ((((d.x - xShift) % wrapW) + wrapW) % wrapW) - 25;
    const x2 = x - d.len * d.slant;
    const y2 = y + d.len;

    // Tapered motion-blur gradient: invisible tail -> luminous drop head
    const alpha = Math.min(0.95, d.alpha + flash * 0.25);
    const grad = ctx.createLinearGradient(x, y, x2, y2);
    grad.addColorStop(0, `rgba(${rgb}, 0)`);
    grad.addColorStop(0.55, `rgba(${rgb}, ${(alpha * 0.55).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${rgb}, ${alpha.toFixed(3)})`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = d.width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Subtle surface mist + micro splash ripples along bottom edge
  if (splashes.length > 0) {
    const mist = ctx.createLinearGradient(0, h - 18, 0, h);
    mist.addColorStop(0, `rgba(${rgb}, 0)`);
    mist.addColorStop(1, `rgba(${rgb}, ${darkDrops ? "0.1" : "0.14"})`);
    ctx.fillStyle = mist;
    ctx.fillRect(0, h - 18, w, 18);

    for (let i = 0; i < splashes.length; i++) {
      const s = splashes[i]!;
      const progress = (t / s.period + s.phase) % 1;
      const rx = 1 + progress * s.maxR;
      const ry = rx * 0.28;
      const alpha = (1 - progress) * 0.4;
      ctx.strokeStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.ellipse(s.x, h - 2.5, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
};

const drawSnow = (ctx: CanvasRenderingContext2D, state: WeatherCanvasState, t: number) => {
  const { width: w, height: h, snow } = state;

  for (let i = 0; i < snow.length; i++) {
    const f = snow[i]!;
    const travel = h + f.r * 5;
    const y = ((((f.y + t * f.speed) % travel) + travel) % travel) - f.r * 2.5;
    // Dual-frequency sway for organic winter turbulence
    const sway =
      Math.sin(t * f.swaySpeed1 + f.phase) * f.swayAmp1 +
      Math.cos(t * f.swaySpeed2 + f.phase * 1.7) * f.swayAmp2;
    const wrapW = w + 32;
    const x = ((((f.x + t * f.drift + sway) % wrapW) + wrapW) % wrapW) - 16;

    if (f.bokeh || f.r >= 2.2) {
      const radius = f.bokeh ? f.r * 1.9 : f.r * 1.5;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(255, 255, 255, ${f.alpha.toFixed(3)})`);
      grad.addColorStop(
        f.bokeh ? 0.42 : 0.55,
        `rgba(232, 244, 255, ${(f.alpha * 0.48).toFixed(3)})`,
      );
      grad.addColorStop(1, "rgba(232, 244, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = `rgba(244, 250, 255, ${f.alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

const strokePath = (ctx: CanvasRenderingContext2D, pts: readonly BoltPoint[]) => {
  const first = pts[0];
  if (first === undefined) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]!;
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
};

const drawStormFlash = (
  ctx: CanvasRenderingContext2D,
  state: WeatherCanvasState,
  intensity: number,
) => {
  if (intensity <= 0.01) return;
  const { width: w, height: h, bolt } = state;

  // Sheet-lightning sky bloom
  const glow = ctx.createRadialGradient(
    w * 0.72,
    h * 0.14,
    0,
    w * 0.72,
    h * 0.24,
    Math.max(w, h) * 0.95,
  );
  glow.addColorStop(0, `rgba(232, 240, 255, ${(intensity * 0.72).toFixed(3)})`);
  glow.addColorStop(0.4, `rgba(182, 200, 246, ${(intensity * 0.3).toFixed(3)})`);
  glow.addColorStop(1, "rgba(182, 200, 246, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Forked lightning with soft electric-violet outer halo + crisp white core
  if (bolt !== null && intensity > 0.5) {
    const alpha = Math.min(1, ((intensity - 0.5) / 0.5) * 0.95);
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Outer plasma glow
    ctx.strokeStyle = `rgba(184, 208, 255, ${(alpha * 0.42).toFixed(3)})`;
    ctx.lineWidth = 4.2;
    strokePath(ctx, bolt.main);

    // Crisp white main channel
    ctx.strokeStyle = `rgba(250, 253, 255, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 1.4;
    strokePath(ctx, bolt.main);

    // Tapered sub-branches
    ctx.strokeStyle = `rgba(232, 242, 255, ${(alpha * 0.75).toFixed(3)})`;
    ctx.lineWidth = 0.85;
    for (let i = 0; i < bolt.branches.length; i++) {
      strokePath(ctx, bolt.branches[i]!);
    }
    ctx.restore();
  }
};

const drawReadabilityScrim = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sky: WeatherSky,
) => {
  const light = isLightSky(sky);
  const grad = ctx.createLinearGradient(0, h * 0.48, 0, h);
  if (light) {
    grad.addColorStop(0, "rgba(18, 28, 48, 0)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0.14)");
  } else {
    grad.addColorStop(0, "rgba(5, 7, 12, 0)");
    grad.addColorStop(1, "rgba(5, 7, 12, 0.34)");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.48, w, h * 0.52);
};

export const renderWeatherFrame = (
  ctx: CanvasRenderingContext2D,
  state: WeatherCanvasState,
  t: number,
  reducedMotion: boolean,
) => {
  const { width: w, height: h, scene } = state;
  ctx.clearRect(0, 0, w, h);

  drawHorizonAtmosphere(ctx, w, h, scene.sky);

  const flash = scene.flash ? stormFlashIntensity(t, reducedMotion) : 0;

  if (scene.celestial === "sun") {
    drawSun(ctx, w, h, t, scene.frost);
  } else if (scene.celestial === "moon") {
    drawMoonAndStars(ctx, state, t, reducedMotion);
  }

  if (scene.flash) {
    drawStormFlash(ctx, state, flash);
  }

  if (scene.clouds === "few" || scene.clouds === "overcast") {
    drawClouds(ctx, state, t, flash);
  } else if (scene.clouds === "fog") {
    drawFog(ctx, state, t);
  }

  if (scene.frost) {
    drawFrost(ctx, state, t);
  }

  if (scene.precip === "rain" || scene.precip === "drizzle") {
    drawRain(ctx, state, t, flash);
  } else if (scene.precip === "snow") {
    drawSnow(ctx, state, t);
  }

  drawReadabilityScrim(ctx, w, h, scene.sky);
};
