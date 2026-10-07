/*
 * StickyCta — the page's only fixed element, phones only, JS only (`hidden` until the script
 * runs). It never downloads the APK: it jumps to #install, where the warning comes first. All
 * three labels are in the HTML and CSS shows the one for `data-platform`.
 */
import { html, type Html } from "../html.ts";
import type { Ctx } from "../i18n/index.ts";
import { button } from "./primitives.ts";

export const stickyCta = ({ t }: Ctx): Html => {
  const jump = (href: string, label: string, set: string): Html =>
    html`<span data-set="${set}"
      >${button({
        href,
        label,
        block: true,
        data: { cta: "install_jump", place: "sticky" },
      })}</span
    >`;
  return html`<div class="l-sticky" data-sticky hidden>
    ${jump("#install-android", t("sticky.android"), "android")}
    ${jump("#install-ios", t("sticky.ios"), "ios")}
    ${jump("#install", t("sticky.neutral"), "neutral")}
  </div>`;
};
