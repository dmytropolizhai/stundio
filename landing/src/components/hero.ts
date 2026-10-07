/*
 * Hero — the whole first screen: H1 (the LCP element, plain text), lead, the source line, the
 * "now / next" scene and the device CTA. Order follows 03a section 3.2; if the CTA lands below
 * ~520px on a 360x600 screen the scene moves under it, the button never shrinks. RVT is named
 * only in the source line (02b section 0).
 */
import { html, type Html } from "../html.ts";
import type { Ctx } from "../i18n/index.ts";
import { deviceCta } from "./device-cta.ts";
import { qrCard } from "./qr-card.ts";
import { nowNextScene } from "./scenes.ts";

export const hero = (ctx: Ctx): Html => {
  const { t } = ctx;
  return html`<section class="l-hero" id="top" aria-labelledby="top-h">
    <div class="l-hero__text">
      <h1 class="l-hero__title" id="top-h">${t("hero.title")}</h1>
      <p class="l-hero__lead">${t("hero.subtitle")}</p>
      <p class="l-hero__source">${t("hero.source")}</p>
    </div>
    <div class="l-hero__scene">${nowNextScene(ctx)}</div>
    <div class="l-hero__cta">
      ${deviceCta(ctx, "hero")}
      <p class="l-cta__trust">${t("hero.trust")} ${t("hero.young")}</p>
    </div>
    <div class="l-hero__qr" data-desktop-only>${qrCard(ctx)}</div>
  </section>`;
};
