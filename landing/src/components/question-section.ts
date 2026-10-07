/*
 * QuestionSection — the page's one section template. Every section opens like a lesson card:
 * a 4px pill rail, then the heading. The heading is a single <h2> so a screen reader's heading
 * list reads the answer; `exit` is the section's one text link back to #install. Sections do
 * not animate in on scroll (03a section 6).
 */
import { html, type Html, type Slot } from "../html.ts";

export type QuestionSectionProps = {
  readonly id: string;
  readonly title: string;
  readonly lead?: string;
  readonly proof?: Slot;
  readonly exit?: Slot;
  readonly variant?: "panel";
};

export const questionSection = (p: QuestionSectionProps): Html =>
  html`<section
    class="l-q${p.variant ? ` l-q--${p.variant}` : ""}"
    id="${p.id}"
    aria-labelledby="${p.id}-h"
  >
    <div class="l-q__head">
      <span class="l-q__rail" aria-hidden="true"></span>
      <h2 class="l-q__heading" id="${p.id}-h">${p.title}</h2>
    </div>
    ${p.lead && html`<p class="l-q__lead">${p.lead}</p>`}
    ${p.proof && html`<div class="l-q__proof">${p.proof}</div>`}
    ${p.exit && html`<p class="l-q__exit">${p.exit}</p>`}
  </section>`;
