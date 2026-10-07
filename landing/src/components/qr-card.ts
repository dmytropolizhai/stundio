/*
 * QrCard — the landing's own address as a QR code, shown only on wide screens (a phone cannot
 * scan itself, and `display: none` keeps the lazy image from loading there at all). The image
 * is emitted at build time from the address in config.ts; white card in both themes because a QR
 * only reads as dark-on-light.
 */
import { LANDING_HOST } from "../config.ts";
import { html, type Html } from "../html.ts";
import type { Ctx } from "../i18n/index.ts";

export const qrCard = ({ t }: Ctx): Html =>
  html`<figure class="l-qr">
    <img
      src="/qr.svg"
      width="160"
      height="160"
      loading="lazy"
      decoding="async"
      alt="${t("install.desktop.qr.alt")}: ${LANDING_HOST}"
    />
    <figcaption class="l-qr__addr">${t("install.desktop.qr")}</figcaption>
  </figure>`;
