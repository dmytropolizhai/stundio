/*
 * Footer — where the page proves itself: privacy, both disclaimers in full (they name RVT, which
 * the rest of the page never does), source links, the full language names and the last way out
 * into the app. The analytics opt-out button is `hidden` and only the script reveals it: with no
 * JS there is no analytics either.
 */
import { APP_URL, GITHUB_URL, LICENSE_URL, PRIVACY_URL, RELEASES_URL } from "../config.ts";
import { html, type Html } from "../html.ts";
import type { Ctx } from "../i18n/index.ts";
import { withLatvian } from "../i18n/latvian.ts";
import { langNav } from "./header.ts";
import { button } from "./primitives.ts";

export const footer = (ctx: Ctx): Html => {
  const { t } = ctx;
  return html`<footer class="l-footer">
    <section id="privacy" aria-labelledby="privacy-h">
      <h2 id="privacy-h" class="l-footer__h">${t("privacy.title")}</h2>
      <p>${t("privacy.body")}</p>
      <p>${t("privacy.feedback")}</p>
      <p>${t("privacy.page")}</p>
      <p>
        <a class="l-textlink" href="${PRIVACY_URL}" data-outbound="github">${t("privacy.link")}</a>
      </p>
      <p>
        <button
          class="l-btn l-btn--secondary l-btn--md"
          type="button"
          aria-pressed="false"
          data-optout
          data-done="${t("privacy.optout.done")}"
          hidden
        >
          <span>${t("privacy.optout")}</span>
        </button>
        <span class="l-sr" role="status" data-optout-status></span>
      </p>
    </section>
    <p>${withLatvian(t("footer.disclaimer"), ctx.lang)}</p>
    <p>${t("footer.source")}</p>
    <nav class="l-footer__links" aria-label="${t("footer.links")}">
      ${button({ href: GITHUB_URL, label: t("footer.github"), variant: "link", data: { outbound: "github" } })}
      ${button({ href: RELEASES_URL, label: t("footer.releases"), variant: "link", data: { outbound: "releases" } })}
      ${button({ href: LICENSE_URL, label: t("footer.license"), variant: "link", data: { outbound: "github" } })}
    </nav>
    ${langNav(ctx, true)}
    <p class="l-footer__open">
      ${button({ href: APP_URL, label: t("footer.open"), variant: "secondary", size: "md", data: { cta: "open_web", place: "footer" } })}
    </p>
  </footer>`;
};
