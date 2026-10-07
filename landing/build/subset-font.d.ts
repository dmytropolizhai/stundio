/** `subset-font` ships no types; this is the one call the landing build makes. */
declare module "subset-font" {
  const subsetFont: (
    font: Buffer,
    text: string,
    options?: { targetFormat?: "sfnt" | "woff" | "woff2" },
  ) => Promise<Buffer>;
  export default subsetFont;
}
