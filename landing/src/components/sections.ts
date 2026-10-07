/*
 * The body sections after the hero, each a QuestionSection filled from the dictionary:
 * #now, #changes, #offline, #install (with its three-path tabs), #teachers, #more, #faq.
 * Order and content follow 02a-ia.md / 02b-copy.md. No section has a button of its own except
 * the install ones — everything else exits to #install with a text link.
 */
import { APP_URL, DOWNLOAD_URL, GITHUB_URL, LANDING_HOST, RELEASES_URL } from "../config.ts";
import { html, type Html } from "../html.ts";
import { icon } from "../icons/index.ts";
import type { Ctx } from "../i18n/index.ts";
import { withLatvian } from "../i18n/latvian.ts";
import { button, callout, factList, stepList } from "./primitives.ts";
import { qrCard } from "./qr-card.ts";
import { questionSection } from "./question-section.ts";
import { changesScene } from "./scenes.ts";
import { screenshotFrame, type ShotAvailability } from "./screenshot-frame.ts";

const textLink = (href: string, label: string, data?: Record<string, string>): Html =>
  button({ href, label, variant: "link", ...(data ? { data } : {}) });

export const nowSection = (ctx: Ctx, shots: ShotAvailability): Html => {
  const { t } = ctx;
  const widgets = [
    ["now.widgets.next.name", "now.widgets.next.body"],
    ["now.widgets.countdown.name", "now.widgets.countdown.body"],
    ["now.widgets.allday.name", "now.widgets.allday.body"],
  ] as const;
  return questionSection({
    id: "now",
    title: t("now.title"),
    lead: t("now.lead"),
    proof: html`
      ${factList([
        { icon: "building-2", body: withLatvian(t("now.fact1"), ctx.lang) },
        { icon: "clock", body: t("now.fact2") },
        { icon: "list", body: t("now.fact3") },
      ])}
      <div class="l-widgets">
        <h3 class="l-widgets__title">${t("now.widgets.title")}</h3>
        <dl class="l-widgets__list">
          ${widgets.map(
            ([name, body]) =>
              html`<div class="l-widgets__item">
                <dt>${t(name)}</dt>
                <dd>${t(body)}</dd>
              </div>`,
          )}
        </dl>
        ${callout("ios", t("now.widgets.note"))}
      </div>
      ${screenshotFrame("week-view", t("hero.image.alt"), shots)}
    `,
    exit: textLink("#install", t("now.link"), { cta: "install_jump", place: "now" }),
  });
};

export const changesSection = (ctx: Ctx): Html => {
  const { t } = ctx;
  return questionSection({
    id: "changes",
    title: t("changes.title"),
    lead: t("changes.lead"),
    proof: html`
      ${changesScene(ctx)}
      ${factList([
        { icon: "circle-x", body: t("changes.fact1") },
        { icon: "repeat", body: t("changes.fact2") },
        { icon: "quote", body: t("changes.fact3") },
        { icon: "bell", body: t("changes.notify") },
      ])}
      <p class="l-note">${t("changes.caveat")}</p>
    `,
  });
};

export const offlineSection = (ctx: Ctx): Html => {
  const { t } = ctx;
  return questionSection({
    id: "offline",
    title: t("offline.title"),
    proof: html`<div class="l-pair">
      <div class="l-card">
        ${icon("wifi-off")}
        <h3>${t("offline.net.title")}</h3>
        <p>${t("offline.net.body")}</p>
      </div>
      <div class="l-card">
        ${icon("user-round-x")}
        <h3>${t("offline.account.title")}</h3>
        <p>${t("offline.account.body")}</p>
        <p class="l-note">${t("offline.stats")}</p>
      </div>
    </div>`,
    exit: textLink("#privacy", t("offline.link")),
  });
};

/** One install path. Without JS these three stack in order; the tabs script folds them. */
const panel = (id: "android" | "ios" | "desktop", title: string, body: Html): Html =>
  html`<section class="l-install__panel" id="install-${id}" aria-labelledby="install-${id}-h">
    <h3 id="install-${id}-h">${title}</h3>
    ${body}
  </section>`;

const androidPanel = ({ t }: Ctx): Html =>
  panel(
    "android",
    t("install.android.title"),
    html`
      <p>${t("install.android.why")}</p>
      ${callout("apk", t("install.android.warn"))}
      ${button({
        href: DOWNLOAD_URL,
        label: t("install.android.cta"),
        block: true,
        icon: "download",
        data: { cta: "apk", place: "install" },
      })}
      <p class="l-cta__inapp">
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
      </p>
      ${stepList([
        t("install.android.step1"),
        t("install.android.step2"),
        t("install.android.step3"),
        t("install.android.step4"),
      ])}
      ${factList([
        { icon: "repeat", body: t("install.android.update") },
        {
          icon: "shield-check",
          body: html`<a class="l-textlink" href="${GITHUB_URL}" data-outbound="github"
              >${t("install.android.source")}</a
            >,
            <a class="l-textlink" href="${RELEASES_URL}" data-outbound="releases"
              >${t("install.android.releases")}</a
            >`,
        },
      ])}
      ${callout("quiet", t("install.android.young"))}
      <p>${textLink(APP_URL, t("install.android.web"), { cta: "open_web", place: "install" })}</p>
    `,
  );

const iosPanel = ({ t }: Ctx): Html =>
  panel(
    "ios",
    t("install.ios.title"),
    html`
      <p>${t("install.ios.lead")} ${t("install.ios.safari")}</p>
      ${button({
        href: APP_URL,
        label: t("install.ios.cta"),
        block: true,
        icon: "smartphone",
        data: { cta: "open_web", place: "install" },
      })}
      ${stepList([
        t("install.ios.step1"),
        t("install.ios.step2"),
        t("install.ios.step3"),
        t("install.ios.step4"),
      ])}
      <p class="l-note">${t("install.ios.hint")} ${t("install.ios.note")}</p>
      ${factList([
        { icon: "info", body: t("install.ios.widgets") },
        { icon: "bell", body: t("install.ios.push") },
      ])}
    `,
  );

const desktopPanel = (ctx: Ctx): Html => {
  const { t } = ctx;
  return panel(
    "desktop",
    t("install.desktop.title"),
    html`
      <p>${t("install.desktop.lead")}</p>
      ${button({
        href: APP_URL,
        label: t("install.desktop.cta"),
        block: true,
        icon: "monitor",
        data: { cta: "open_web", place: "install" },
      })}
      <div class="l-install__qr" data-desktop-only>${qrCard(ctx)}</div>
      <p class="l-note">${t("install.desktop.addr")} <span class="l-url">${LANDING_HOST}</span></p>
    `,
  );
};

export const installSection = (ctx: Ctx): Html => {
  const { t } = ctx;
  const tab = (id: string, label: string, selected: boolean): Html =>
    html`<button
      class="l-install__tab"
      role="tab"
      type="button"
      id="tab-${id}"
      aria-controls="install-${id}"
      aria-selected="${selected ? "true" : "false"}"
      tabindex="${selected ? "0" : "-1"}"
    >
      ${label}
    </button>`;
  return questionSection({
    id: "install",
    title: t("install.title"),
    proof: html`<div class="l-install" data-install-tabs>
      <div class="l-install__tabs" role="tablist" aria-label="${t("install.tablist")}" hidden>
        ${tab("android", t("install.tab.android"), true)} ${tab("ios", t("install.tab.ios"), false)}
        ${tab("desktop", t("install.tab.desktop"), false)}
      </div>
      ${androidPanel(ctx)} ${iosPanel(ctx)} ${desktopPanel(ctx)}
    </div>`,
  });
};

export const teachersSection = ({ t }: Ctx): Html =>
  questionSection({
    id: "teachers",
    title: t("teachers.title"),
    lead: t("teachers.lead"),
    variant: "panel",
    proof: html`
      ${factList(
        [
          { icon: "user-round", body: t("teachers.item1") },
          { icon: "building-2", body: t("teachers.item2") },
          { icon: "repeat", body: t("teachers.item3") },
          { icon: "users", body: t("teachers.item4") },
          { icon: "split", body: t("teachers.item5") },
          { icon: "bell", body: t("teachers.item6") },
        ],
        "l-facts l-facts--compact",
      )}
      <p class="l-note">${t("teachers.note")}</p>
      <p>${t("teachers.install")}</p>
    `,
    exit: textLink("#install", t("teachers.link"), { cta: "install_jump", place: "teachers" }),
  });

export const moreSection = ({ t }: Ctx): Html =>
  questionSection({
    id: "more",
    title: t("more.title"),
    proof: factList(
      [
        { icon: "share-2", body: t("more.share") },
        { icon: "split", body: t("more.subgroups") },
        { icon: "languages", body: t("more.langs") },
        { icon: "sun-moon", body: t("more.themes") },
      ],
      "l-facts l-facts--compact",
    ),
  });

const FAQ_IDS = ["official", "play", "apk", "free", "privacy", "data", "wrong", "updates"] as const;
/** Answers that point the reader at the Android steps (02b notes). */
const FAQ_WITH_INSTALL_LINK: readonly string[] = ["play", "apk"];

export const faqSection = ({ t }: Ctx): Html =>
  questionSection({
    id: "faq",
    title: t("faq.title"),
    proof: html`<div class="l-faq">
      ${FAQ_IDS.map((id) => {
        const q = t(`faq.${id}.q`);
        const a = t(`faq.${id}.a`);
        return html`<details class="l-faq__item" id="faq-${id}">
          <summary class="l-faq__q"><span>${q}</span>${icon("chevron-down")}</summary>
          <div class="l-faq__a">
            <p>${a}</p>
            ${
              FAQ_WITH_INSTALL_LINK.includes(id) &&
              html`<p>
                ${textLink("#install-android", t("install.title"), { cta: "install_jump", place: "faq" })}
              </p>`
            }
          </div>
        </details>`;
      })}
    </div>`,
  });
