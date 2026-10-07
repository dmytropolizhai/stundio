/*
 * DeviceCta — "one button for my phone". All four sets (neutral, android, ios, desktop) are in
 * the HTML; the head script stamps `data-platform` on <html> before first paint and CSS shows
 * exactly one. Without JS there is no stamp, so the neutral set shows: two equal buttons and an
 * "open in browser" link, nothing hidden. The script only enhances it (platform override,
 * "what's next" panel after the APK click, copy-address button).
 *
 * The APK button is a plain link to /download — never intercepted, never `window.open` — because
 * in-app browsers are fragile about downloads (03a section 7).
 */
import { APP_URL, DOWNLOAD_URL, LANDING_HOST } from "../config.ts";
import { html, type Html } from "../html.ts";
import type { Ctx } from "../i18n/index.ts";
import { button, stepList } from "./primitives.ts";

export type CtaPlace = "hero" | "final";

const inAppLine = ({ t }: Ctx): Html =>
  html`<p class="l-cta__inapp">
    ${t("install.android.fallback")} <span class="l-url">${LANDING_HOST}</span>
    <button
      class="l-btn l-btn--ghost l-btn--md"
      type="button"
      data-copy-url
      data-copied="${t("install.android.copied")}"
      hidden
    >
      <span>${t("install.android.copy")}</span>
    </button>
    <span class="l-sr" role="status" data-copy-status></span>
  </p>`;

const afterApk = ({ t }: Ctx): Html =>
  html`<div class="l-after" data-after-apk role="status" hidden>
    <p class="l-after__title">${t("hero.next.title")}</p>
    ${stepList(
      [
        t("install.android.step2"),
        t("install.android.step3"),
        t("install.android.step4"),
        t("install.android.update"),
      ],
      true,
    )}
    <p class="l-after__fail">${t("hero.next.fail")}</p>
  </div>`;

export const deviceCta = (ctx: Ctx, place: CtaPlace): Html => {
  const { t } = ctx;
  const onField = place === "final";
  const primary = onField ? "onField" : "primary";
  const data = (action: string): Record<string, string> => ({ cta: action, place });
  const hero = place === "hero";
  // The final block puts the APK warning above its button (disclaimer 3 comes first), so the
  // android/neutral sets skip their own micro line there.
  const apkMicro = hero && html`<p class="l-cta__micro">${t("hero.cta.android.micro")}</p>`;

  return html`<div class="l-cta" data-device-cta data-place="${place}">
    <div class="l-cta__set" data-set="neutral">
      ${button({
        href: DOWNLOAD_URL,
        label: t("hero.cta.neutral.android"),
        variant: primary,
        block: true,
        icon: "download",
        data: data("apk"),
      })}
      ${button({
        href: "#install-ios",
        label: t("hero.cta.neutral.ios"),
        variant: primary,
        block: true,
        icon: "smartphone",
        data: data("install_jump"),
      })}
      ${apkMicro}
      ${button({ href: APP_URL, label: t("hero.cta.openWeb"), variant: "link", data: data("open_web") })}
      ${hero && inAppLine(ctx)}
    </div>

    <div class="l-cta__set" data-set="android">
      ${button({
        href: DOWNLOAD_URL,
        label: t("hero.cta.android"),
        variant: primary,
        block: true,
        icon: "download",
        data: data("apk"),
      })}
      ${apkMicro}
      <p class="l-cta__links">
        ${button({ href: "#install-android", label: t("hero.cta.android.how"), variant: "link", data: data("install_jump") })}
        ${button({ href: "#install-ios", label: t("hero.cta.switch.ios"), variant: "link", data: { "platform-switch": "ios" } })}
      </p>
      ${hero && inAppLine(ctx)} ${hero && afterApk(ctx)}
    </div>

    <div class="l-cta__set" data-set="ios">
      ${button({
        href: APP_URL,
        label: t("hero.cta.ios"),
        variant: primary,
        block: true,
        icon: "smartphone",
        data: data("open_web"),
      })}
      <p class="l-cta__micro">${t("hero.cta.ios.micro")}</p>
      <p class="l-cta__links">
        ${button({ href: "#install-ios", label: t("hero.cta.ios.how"), variant: "link", data: data("install_jump") })}
        ${button({ href: "#install-android", label: t("hero.cta.switch.android"), variant: "link", data: { "platform-switch": "android" } })}
      </p>
    </div>

    <div class="l-cta__set" data-set="desktop">
      ${button({
        href: APP_URL,
        label: t("hero.cta.desktop"),
        variant: primary,
        block: true,
        icon: "monitor",
        data: data("open_web"),
      })}
      <p class="l-cta__micro">
        ${t("hero.cta.desktop.micro")}
        <span class="l-cta__qrhint">${t("hero.cta.desktop.qr")}</span>
      </p>
      <p class="l-cta__links">
        ${button({ href: "#install-android", label: t("install.android.title"), variant: "link", data: data("install_jump") })}
      </p>
    </div>
  </div>`;
};
