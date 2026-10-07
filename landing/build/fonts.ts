/*
 * Per-language font subsetting. `@fontsource` ships Manrope as whole Unicode blocks (latin,
 * latin-ext, cyrillic …) — four weights of them come to ~90–120 KB, over the first-screen
 * budget (03b F7). Here each language page gets only the glyphs its own copy uses: for every
 * weight and every block the page touches, one woff2 holding just those glyphs, declared with the
 * block's own `unicode-range` so the browser fetches a block only if a character in it appears.
 * JetBrains Mono (times only) is cut down to digits and the separators the scene uses.
 *
 * Needs the build to run in Node (harfbuzz-wasm via `subset-font`); the output is deterministic,
 * so the content hash in each file name only changes when the copy does.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import subsetFont from "subset-font";

const require = createRequire(import.meta.url);

export const MANROPE_WEIGHTS = [500, 600, 700, 800] as const;
const MANROPE_BLOCKS = ["latin", "latin-ext", "cyrillic"] as const;
export const FONT_URL_PREFIX = "/assets/fonts/";

export type FontFile = { readonly name: string; readonly data: Buffer };
export type LangFonts = {
  readonly files: readonly FontFile[];
  readonly css: string;
  /** URLs worth a `<link rel=preload>`: the H1 weight and the body weight, Latin block. */
  readonly preloads: readonly string[];
};

type Range = readonly [number, number];

/** `U+0460-052F,U+20B4` -> [[0x460,0x52f],[0x20b4,0x20b4]] */
export const parseUnicodeRange = (range: string): readonly Range[] =>
  range.split(",").map((part) => {
    const [from = "", to = from] = part.trim().replace(/^U\+/i, "").split("-");
    return [parseInt(from, 16), parseInt(to, 16)] as const;
  });

export const inRanges = (codePoint: number, ranges: readonly Range[]): boolean =>
  ranges.some(([from, to]) => codePoint >= from && codePoint <= to);

const fontsourceDir = (pkg: string): string =>
  require.resolve(`${pkg}/package.json`).replace(/package\.json$/, "");

/** block -> unicode-range, read from the package's own CSS so it never drifts. */
const readBlockRanges = (pkg: string, cssFile: string): Map<string, string> => {
  const css = readFileSync(`${fontsourceDir(pkg)}${cssFile}`, "utf-8");
  const family = pkg.split("/")[1] ?? "";
  const out = new Map<string, string>();
  const rule = /\/\* (\S+?)-\d+-normal \*\/[^}]*?unicode-range:\s*([^;]+);/g;
  for (const match of css.matchAll(rule)) {
    const [, name, range] = match;
    if (name?.startsWith(`${family}-`) && range) out.set(name.slice(family.length + 1), range);
  }
  return out;
};

const hashOf = (data: Buffer): string => createHash("sha1").update(data).digest("hex").slice(0, 10);

const face = (family: string, weight: number, url: string, range: string): string =>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;` +
  `src:url(${url}) format("woff2");unicode-range:${range}}`;

const subsetPiece = (pkg: string, file: string, text: string): Promise<Buffer> =>
  subsetFont(readFileSync(`${fontsourceDir(pkg)}files/${file}`), text, { targetFormat: "woff2" });

/**
 * `corpus` is every character the page can show in Manrope; `monoCorpus` those in JetBrains
 * Mono. Both are plain strings — order and repeats do not matter.
 */
export const buildLangFonts = async (
  lang: string,
  corpus: string,
  monoCorpus: string,
): Promise<LangFonts> => {
  const files: FontFile[] = [];
  const rules: string[] = [];
  const preloads: string[] = [];
  const chars = [...new Set(corpus)];

  for (const weight of MANROPE_WEIGHTS) {
    const ranges = readBlockRanges("@fontsource/manrope", `${weight}.css`);
    for (const block of MANROPE_BLOCKS) {
      const range = ranges.get(block);
      if (!range) throw new Error(`manrope ${weight} ${block}: unicode-range not found`);
      const parsed = parseUnicodeRange(range);
      const text = chars.filter((c) => inRanges(c.codePointAt(0) ?? 0, parsed)).join("");
      if (!text.trim()) continue;
      const file = `manrope-${block}-${weight}-normal.woff2`;
      const data = await subsetPiece("@fontsource/manrope", file, text);
      const name = `manrope-${weight}-${block}.${lang}.${hashOf(data)}.woff2`;
      files.push({ name, data });
      rules.push(face("Manrope", weight, FONT_URL_PREFIX + name, range));
      if (block === "latin" && (weight === 800 || weight === 500)) {
        preloads.push(FONT_URL_PREFIX + name);
      }
    }
  }

  const monoRange = readBlockRanges("@fontsource/jetbrains-mono", "500.css").get("latin");
  if (!monoRange) throw new Error("jetbrains-mono 500 latin: unicode-range not found");
  const mono = await subsetPiece(
    "@fontsource/jetbrains-mono",
    "jetbrains-mono-latin-500-normal.woff2",
    monoCorpus,
  );
  const monoName = `jbmono-500.${hashOf(mono)}.woff2`;
  files.push({ name: monoName, data: mono });
  rules.push(face("JetBrains Mono", 500, FONT_URL_PREFIX + monoName, monoRange));

  return { files, css: rules.join(""), preloads };
};
