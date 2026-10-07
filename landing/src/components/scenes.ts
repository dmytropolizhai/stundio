/*
 * The two HTML/CSS illustrations that stand in for screenshots we do not have: the hero's
 * "now / next" card (anatomy from `widget_next_lesson.xml` and `LessonRow.tsx`) and the
 * "cancelled lesson stays in place" list. Both are fixed examples (content/scene.ts), carry a
 * visible "illustration" pill outside the `role="img"` node, and describe themselves fully in an
 * `aria-label` — their inner markup is presentation only.
 */
import { SCENE_CHANGES, SCENE_NEXT, SCENE_NOW } from "../content/scene.ts";
import { html, type Html } from "../html.ts";
import { icon } from "../icons/index.ts";
import type { Ctx } from "../i18n/index.ts";
import { withLatvian } from "../i18n/latvian.ts";
import { pill } from "./primitives.ts";

export const nowNextScene = ({ t, lang }: Ctx): Html => {
  const now = SCENE_NOW;
  const next = SCENE_NEXT;
  return html`<figure class="l-scene">
    <div class="l-scene__card" role="img" aria-label="${t("scene.now.aria")}">
      <div class="l-scene__row l-scene__row--now" style="--rail: var(--l-accent-a)">
        <span class="l-scene__rail"></span>
        <span class="l-scene__body">
          <span class="l-eyebrow">${t("scene.now")}</span>
          <span class="l-scene__subject">${withLatvian(now.subject, lang)}</span>
          <span class="l-scene__meta"
            >${icon("map-pin", 14)}<span
              >${now.room} · ${withLatvian(now.building, lang)}</span
            ></span
          >
        </span>
        <span class="l-scene__time">
          <span class="l-time">${now.start}–${now.end}</span>
          <span class="l-scene__left">${t("scene.left")}</span>
        </span>
        <span class="l-progress"
          ><span class="l-progress__fill" style="--p: ${now.progress}"></span
        ></span>
      </div>
      <div class="l-scene__row l-scene__row--next" style="--rail: var(--l-accent-b)">
        <span class="l-scene__rail"></span>
        <span class="l-scene__body">
          <span class="l-eyebrow">${t("scene.next")}</span>
          <span class="l-scene__subject">${withLatvian(next.subject, lang)}</span>
          <span class="l-scene__meta"
            >${icon("map-pin", 14)}<span
              >${next.room} · ${withLatvian(next.building, lang)}</span
            ></span
          >
        </span>
        <span class="l-scene__time">
          <span class="l-time">${next.start}</span>
          <span class="l-scene__left">${t("scene.until")}</span>
        </span>
      </div>
    </div>
    <figcaption class="l-scene__caption">
      ${pill("illustration", t("scene.illustration"))}
      <span>${t("scene.widgetNote")}</span>
    </figcaption>
  </figure>`;
};

export const changesScene = ({ t, lang }: Ctx): Html =>
  html`<figure class="l-changes" data-changes-anim>
    <ol class="l-changes__list" role="img" aria-label="${t("scene.changes.aria")}">
      ${SCENE_CHANGES.map(
        (lesson) =>
          html`<li
            class="l-lesson${lesson.cancelled ? " l-lesson--cancelled" : ""}"
            style="--rail: var(--l-accent-${lesson.accent}); --ink: var(--l-accent-${lesson.accent}-ink)"
          >
            <span class="l-lesson__rail"></span>
            <span class="l-lesson__times">
              <span class="l-lesson__start l-time l-strike">${lesson.start}</span>
              <span class="l-lesson__end l-time">${lesson.end}</span>
            </span>
            <span class="l-lesson__n">${lesson.n}</span>
            <span class="l-lesson__body">
              <span class="l-lesson__subject l-strike">${withLatvian(lesson.subject, lang)}</span>
              <span class="l-lesson__meta"
                >${icon("map-pin", 14)}<span class="l-strike-meta"
                  >${lesson.room} · ${withLatvian(lesson.building, lang)}</span
                ></span
              >
            </span>
            ${lesson.cancelled && html`<span class="l-lesson__badge">${t("scene.cancelled")}</span>`}
          </li>`,
      )}
    </ol>
    <figcaption class="l-scene__caption">
      ${pill("illustration", t("scene.illustration"))} ${pill("school", t("scene.school"))}
    </figcaption>
  </figure>`;
