/*
 * ScreenshotFrame — a real app screenshot as a rounded "screen card", no device bezel. Only
 * names in ALLOWED_SHOTS render (the others show real teachers' names). A shot whose files are
 * not in the build is omitted in production and the section lives on text; with
 * LANDING_PLACEHOLDERS=1 (dev/preview) a labelled hole is drawn instead so a reviewer sees it.
 */
import { ALLOWED_SHOTS, SHOT_SIZE, type ShotName } from "../content/scene.ts";
import { html, type Html } from "../html.ts";
import { icon } from "../icons/index.ts";

export type ShotAvailability = {
  /** Shot names whose avif/webp/png exist under landing/public/img. */
  readonly available: ReadonlySet<string>;
  readonly placeholders: boolean;
};

export const screenshotFrame = (
  name: ShotName,
  alt: string,
  availability: ShotAvailability,
): Html | null => {
  if (!ALLOWED_SHOTS.includes(name)) {
    throw new Error(`Screenshot "${name}" is not on the allowlist (it may show people's names).`);
  }
  const { width, height } = SHOT_SIZE[name];
  if (!availability.available.has(name)) {
    if (!availability.placeholders) return null;
    return html`<figure class="l-shot l-shot--missing" style="--w: ${width}px">
      <div class="l-shot__hole" style="aspect-ratio: ${width} / ${height}">
        ${icon("image-off")}
      </div>
      <figcaption class="l-shot__caption">${name}: missing image</figcaption>
    </figure>`;
  }
  return html`<figure class="l-shot">
    <picture>
      <source type="image/avif" srcset="/img/${name}.avif" />
      <source type="image/webp" srcset="/img/${name}.webp" />
      <img
        src="/img/${name}.png"
        width="${width}"
        height="${height}"
        loading="lazy"
        decoding="async"
        alt="${alt}"
      />
    </picture>
  </figure>`;
};
