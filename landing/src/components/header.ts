/*
 * SkipLink, Header and the two language switchers. The header is a brand plus four plain links —
 * no menu, not sticky (the design system allows one fixed thing; on this page it is the install
 * bar). Every link works without JS; the head/main scripts only remember the choice and carry
 * the URL hash across.
 */
import { LANGS, LANG_NAMES, HTML_LANG, langPath, type Ctx, type Lang } from "../i18n/index.ts";
import { attr, html, type Html } from "../html.ts";
import { mark } from "../icons/index.ts";

export const skipLink = ({ t }: Ctx): Html =>
  html`<a class="l-skip" href="#main">${t("a11y.skip")}</a>`;

const langLink = (target: Lang, current: Lang, full: boolean): Html => {
  const code = target.toUpperCase();
  const label = full ? LANG_NAMES[target] : code;
  return html`<li>
    <a
      href="${langPath(target)}"
      hreflang="${HTML_LANG[target]}"
      lang="${HTML_LANG[target]}"
      data-lang="${target}"
      ${attr("aria-current", target === current ? "page" : null)}
      >${label}${!full && html`<span class="l-sr"> ${LANG_NAMES[target]}</span>`}</a
    >
  </li>`;
};

export const langNav = ({ t, lang }: Ctx, full: boolean): Html =>
  html`<nav
    class="l-lang${full ? " l-lang--full" : ""}"
    aria-label="${full ? t("footer.langs") : t("header.langLabel")}"
  >
    <ul>
      ${LANGS.map((l) => langLink(l, lang, full))}
    </ul>
  </nav>`;

export const header = (ctx: Ctx): Html =>
  html`<header class="l-header">
    <a class="l-brand" href="#top" aria-label="${ctx.t("header.logoLabel")}"
      >${mark()}<span class="l-brand__name">Stundio</span></a
    >
    ${langNav(ctx, false)}
  </header>`;
