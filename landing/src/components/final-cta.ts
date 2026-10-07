/*
 * FinalCta — the page's one blue field (`--l-field`): the same device CTA again after the FAQ,
 * for the visitor who read everything and is ready. The APK warning sits ABOVE the button here
 * (disclaimer 3 must precede every APK button). The `onField` buttons are white, not blue — the
 * design system has no blue buttons.
 */
import { html, type Html } from "../html.ts";
import type { Ctx } from "../i18n/index.ts";
import { deviceCta } from "./device-cta.ts";
import { pill } from "./primitives.ts";

export const finalCta = (ctx: Ctx): Html => {
  const { t } = ctx;
  return html`<section class="l-final" aria-labelledby="final-h" data-final>
    <h2 class="l-final__title" id="final-h">${t("hero.title")}</h2>
    <p class="l-final__warn">${t("hero.cta.android.micro")}</p>
    ${deviceCta(ctx, "final")}
    <p class="l-final__pill">${pill("unofficial", t("pill.unofficial"))}</p>
  </section>`;
};
