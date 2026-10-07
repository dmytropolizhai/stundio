/*
 * The small shared pieces: Button, SourcePill, Callout, StepList, FactList. Each is a pure
 * function from props to HTML; text is always passed in (from the dictionary), never invented
 * here. Interactive hooks for the scripts are `data-*` attributes only — never classes.
 */
import { escapeHtml, html, raw, type Html, type Slot } from "../html.ts";
import { icon, type IconName } from "../icons/index.ts";

export type ButtonProps = {
  readonly href: string;
  readonly label: string;
  readonly variant?: "primary" | "secondary" | "ghost" | "onField" | "link";
  readonly size?: "lg" | "md";
  readonly block?: boolean;
  readonly icon?: IconName;
  readonly data?: Readonly<Record<string, string>>;
};

const dataAttrs = (data: Readonly<Record<string, string>> | undefined): Html => {
  return raw(
    Object.entries(data ?? {})
      .map(([k, v]) => ` data-${k}="${escapeHtml(v)}"`)
      .join(""),
  );
};

export const button = (p: ButtonProps): Html => {
  const variant = p.variant ?? "primary";
  const classes = [
    "l-btn",
    `l-btn--${variant}`,
    variant === "link" ? "" : `l-btn--${p.size ?? "lg"}`,
    p.block ? "l-btn--block" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const size = p.size === "md" ? 18 : 20;
  return html`<a class="${classes}" href="${p.href}" ${dataAttrs(p.data)}
    >${p.icon && icon(p.icon, size)}<span>${p.label}</span></a
  >`;
};

export type PillKind = "illustration" | "school" | "unofficial";
const PILL_ICON: Record<PillKind, IconName> = {
  illustration: "image",
  school: "quote",
  unofficial: "info",
};

/** The honest chip: says what a thing is (illustration), where text comes from, or who we are. */
export const pill = (kind: PillKind, label: string): Html =>
  html`<span class="l-pill l-pill--${kind}"
    >${icon(PILL_ICON[kind], 14)}<span>${label}</span></span
  >`;

export type CalloutKind = "apk" | "ios" | "quiet";

/** Important text in the flow, never fine print. `role="note"`: nothing here changes live. */
export const callout = (kind: CalloutKind, body: Slot): Html =>
  html`<div class="l-callout l-callout--${kind}" role="note">
    ${kind === "apk" && icon("shield-check")}${kind === "ios" && icon("info")}
    <p class="l-callout__text">${body}</p>
  </div>`;

export const stepList = (steps: readonly string[], compact = false): Html =>
  html`<ol class="l-steps${compact ? " l-steps--compact" : ""}">
    ${steps.map((text) => html`<li class="l-steps__item"><span>${text}</span></li>`)}
  </ol>`;

export type Fact = { readonly icon: IconName; readonly body: Slot };

export const factList = (facts: readonly Fact[], className = "l-facts"): Html =>
  html`<ul class="${className}">
    ${facts.map(
      (f) =>
        html`<li>
          ${icon(f.icon)}
          <p>${f.body}</p>
        </li>`,
    )}
  </ul>`;
