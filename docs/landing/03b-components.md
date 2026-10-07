# 03b — Библиотека компонентов лендинга

Подзадача 3.2 из `docs/landing/PLAN.md`. Дата: 2026-10-06.

Вход: `03a-direction.md` (утверждённое направление), `02a-ia.md`, `01c-claims-and-voice.md`,
`02c-assets.md`, `DESIGN.md`, `src/ds/tokens/*.css`, `src/ds/components/ui/{button,badge,
lesson-card,sync-status}.tsx`, `src/index.css` (маппинг Tailwind-темы), `src/ui/components/
LessonRow.tsx`, `android/app/src/main/res/layout/widget_next_lesson.xml`, `vite.config.ts`,
`public/{sw.js,manifest.webmanifest,mark.svg}`, `index.html`, `functions/{download,apk}.ts`,
`.github/workflows/ci.yml`, `capacitor.config.ts`, `eslint.config.js`, `.prettierignore`.
Скиллы: impeccable (режим поверхности **Persuade**, мир уже задан Studio DS), ui-ux-pro-max
`design-system` (трёхслойные токены primitive → semantic → component, шаблон спецификации
состояний).

Документ задаёт **что** строить и **по каким правилам**. Код страницы пишет 3.3. Тексты в
примерах разметки — смысловые заглушки на LV; финальный текст дают 2.2 (`02b-copy.md`) и
ограничения `01c`.

---

## 0. Находки, которые меняют реализацию

Проверено в коде, в 03a/02a не отражено или отражено неточно.

| # | Находка | Где | Что делаем |
| --- | --- | --- | --- |
| F1 | **Service worker приложения перехватывает все навигации того же origin** (кроме `/api-*`) и кладёт **любой** ответ 200 в кэш под ключом `/` («оболочка»). Если лендинг окажется на том же origin (`/landing/` или корень), то первый же визит на лендинг у человека с установленным SW **затрёт офлайн-оболочку приложения HTML-ом лендинга**: следующий офлайн-запуск PWA покажет лендинг. А офлайн-визит на лендинг вернёт приложение | `public/sw.js` `navigate()` → `cache.put(SHELL_URL, copy)` | Лендинг — на **отдельном origin** (§1.3). Путь на том же origin возможен только с правкой `sw.js` (§1.4) |
| F2 | `public/mark.svg` залит `fill="white"` — на светлой странице невидим | `public/mark.svg` | Mark инлайнится в шапку как `<svg>` с `fill="currentColor"` (тот же `path`) |
| F3 | В shipped-приложении **кольцо «сейчас», бейдж «Tagad» и заливка прогресса — `--brand`** (ink-900 в светлой, ink-100 в тёмной), не электрик. `src/index.css` даже переотображает `blue-*` Tailwind-классы на ink. DESIGN.md всё ещё описывает электрическое кольцо | `lesson-card.tsx` (`inset-ring-brand`), `LessonRow.tsx` (`bg-brand`), `src/index.css:171-196` | Направление 03a (электрическое кольцо) сохраняем, но через **один токен** `--l-now` — переключение на паритет с приложением = одна строка (§2.2, вопрос Q2) |
| F4 | В тёмной теме бейдж `danger` приложения — белый текст на `#ff6b5e`: **2.79:1, провал** | `badge.tsx` + `dark.css` | На лендинге бейдж «Atcelta» в тёмной — ink-900 на `#ff6b5e` (7.00). Приложению — сообщить автору, не чинить |
| F5 | DS-отмена «55 % opacity на всю карточку» роняет вторичный текст (caption) до 2.4–3.0:1 в обеих темах | расчёт §2.4 | В иллюстрации гасим только время и название предмета; метаданные остаются полного контраста, зачёркнуты (§3.9) |
| F6 | Трек прогресса `--surface-sunken` почти не отличим от карточки (1.15 / 1.06) | расчёт §2.4 | Полоса — `aria-hidden` дубликат текста «vēl 19 min»; информация не держится на треке |
| F7 | Шрифты из `@fontsource` по подмножествам: Manrope 4 веса × (latin 14 KB + latin-ext 8 KB) ≈ **89 KB** для LV и ≈ **120 KB** для RU/UA. Это выше бюджета 03a (70 / 95 KB) | `node_modules/@fontsource/manrope/files` (замер) | Сабсеттинг по языку страницы на сборке (§1.2, п. 6) |
| F8 | CI проверяет весь репозиторий: `eslint .` (TS-файлы требуют `projectService`), `prettier --check .`, `tsc -b`. ESLint игнорирует только корневой `dist` | `ci.yml`, `eslint.config.js`, `tsconfig.json` | `landing/dist` в ignore ESLint; TS лендинга в отдельном `tsconfig.landing.json` с reference из корня (§5) |
| F9 | Если лендинг собирать в общий `dist/` приложения, он попадёт в **APK** (Capacitor `webDir: "dist"`) и в **прекэш SW** (`BUILD_ASSETS` = все файлы бандла) | `capacitor.config.ts`, `vite.config.ts` `precacheManifest` | Отдельная сборка в `landing/dist`, корневой `vite.config.ts` не трогаем |

---

## 1. Архитектура CSS и сборки

### 1.1 Рекомендация (одна)

**Отдельная Vite-сборка `landing/vite.config.ts` (multi-page, без фреймворка в рантайме):
страницы рендерятся на этапе сборки из TS-функций-компонентов, которые возвращают HTML-строки;
CSS — обычные файлы на токенах DS; JS — несколько маленьких модулей прогрессивного улучшения.
Выход — `landing/dist`, деплой — отдельный проект Cloudflare Pages.**

Почему так, а не иначе:

| Вариант | Плюс | Почему не он |
| --- | --- | --- |
| Чистый HTML + CSS руками | Ноль инструментов | 4 языка × 10 секций = 4 копии разметки; claims и дисклеймеры разъедутся (`01c` §3 «четыре места для расхождений»); нет хешей, минификации, сабсеттинга |
| Vite multi-page **в корневом конфиге** | Один `npm run build` | Лендинг попадает в APK и прекэш SW (F9), меняет `vite.config.ts` приложения, тянет React/Tailwind-плагины в чужую страницу |
| Astro | Компоненты, i18n-роутинг, 0 JS по умолчанию | Новый фреймворк, новый синтаксис и свой Vite ради одной страницы; всё, что он даёт, покрывается ~200 строками плагинов на уже установленном Vite |
| **Отдельный Vite-конфиг + render-функции** | Vite уже в репо; dev-сервер с перезагрузкой для 3.3/3.5; CSS импортирует **файлы** `src/ds/tokens/*.css` (без копий, закрывает риск 03a §9 #9); хеши и минификация из коробки; конфиг Vite бандлится esbuild, поэтому плагин сборки может читать `src/lib/share/qr.ts` (QR на сборке) | Нужны 4 маленьких плагина (§5). Принято |

Новые зависимости: одна dev-зависимость `subset-font` (сабсеттинг шрифтов на harfbuzz-wasm,
без Python). Картинки конвертируются один раз вручную (AVIF/WebP/PNG) и коммитятся в
`landing/public/img/`: ради 1–3 скриншотов `sharp` в сборке не нужен.

### 1.2 Как устроена сборка

1. **Рендер страниц.** `landing/build/pages.ts` (плагин Vite) импортирует
   `landing/src/render.ts` → `renderPage(lang)` и пишет 4 файла: `index.html` (LV),
   `ru/index.html`, `en/index.html`, `ua/index.html` (`<html lang="uk">`). Они же — `rollupOptions.input`.
   В dev плагин перерендеривает страницы по изменению `landing/src/**` и делает full reload.
2. **Компоненты** — чистые функции `(props, t) => string` в `landing/src/components/*.ts`
   поверх тегированного шаблона `html\`\`` с экранированием (`landing/src/html.ts`). Текст
   только из словарей `landing/src/i18n/{lv,ru,en,ua}.ts`, типизированных по ключам `lv.ts`
   (тот же приём, что в приложении). Свободного текста в компонентах нет.
3. **CSS.** `landing/src/styles/index.css` импортирует
   `../../../src/ds/tokens/{colors,spacing,surfaces,typography,motion}.css`, виртуальный
   `virtual:ds-dark.css` (п. 4), `tokens.css` (`--l-*`), `base.css`, `layout.css`,
   `components/*.css`. На выходе весь CSS **инлайнится** в `<style>` каждой страницы
   (плагин `inline-css.ts`): целевой размер ≤ 9 KB gzip, отдельный запрос не нужен.
   `fonts.css` из DS **не** импортируется (тянет Moho и все веса через `@fontsource`).
4. **Тёмная тема без копий.** Плагин `ds-dark.ts` читает `src/ds/tokens/dark.css`, берёт тело
   блока `:root.dark { … }` и отдаёт его как
   `@media (prefers-color-scheme: dark) { :root { … } }`. Изменение DS → обе поверхности
   меняются вместе. Landing-переопределения тёмной темы (`--l-now` и др.) — в `tokens.css`
   под тем же media-запросом. Сборка падает, если блок `:root.dark` не найден (как
   `precacheManifest` падает без плейсхолдеров).
5. **JS.** Инлайн-скрипт в `<head>` (≤ 1 KB min: платформа, язык, класс `js`) + один модуль
   `main.ts` (`type="module"`, в конце `body`), который подключает улучшения по наличию
   `data-*`-хуков. Бюджет всего JS ≤ 10 KB gzip; цель ≤ 6 KB. Ошибка в модуле не ломает
   страницу: базовый HTML полный (§3, состояние «no-JS» у каждого компонента).
6. **Шрифты.** Плагин `fonts.ts` для каждого языка собирает множество символов из словаря
   языка + сценария иллюстраций + ASCII и через `subset-font` выпускает
   `manrope-{500,600,700,800}.<lang>.<hash>.woff2` и `jbmono-500.digits.<hash>.woff2`
   (`0-9 : – . · m i n` и пробел). Ожидание ≈ 8–12 KB на вес → LV ≈ 45 KB, RU/UA ≈ 50 KB
   (замерить в 3.3; это не обещание). Preload — только 800 (H1) и 500 (текст) своего языка.
   Если `subset-font` не заведётся — запасной путь: `@fontsource`-файлы с `unicode-range`
   и только три веса 500/700/800 (кнопки на 700 — явное отступление от DS, записать в 3.6).
7. **Мета.** `meta.ts` пишет `theme-color` (значения читаются из `colors.css`/`dark.css`, а не
   вписываются руками), `hreflang` (`lv`, `ru`, `en`, `uk`, `x-default` → LV), canonical,
   `sitemap.xml` с альтернативами, `robots.txt`, QR-SVG адреса лендинга (через
   `encodeQr` из `src/lib/share/qr.ts`, только чтение).

### 1.3 Деплой: где живёт лендинг

**Рекомендация: отдельный проект Cloudflare Pages `stundio-landing`** (адрес
`stundio-landing.pages.dev`, позже — свой домен). Приложение остаётся на
`stundio.pages.dev` как есть: ни один байт `dist/`, `public/`, `functions/` не меняется.

- Все CTA лендинга — **абсолютные** адреса: `https://stundio.pages.dev/download` (APK),
  `https://stundio.pages.dev/` (веб-приложение). Ссылка «Открыть» никогда не ведёт на лендинг
  (`02a` §2.2).
- У лендинга свой `_headers` (кэш, безопасность), свой `404.html` (на отдельном проекте он
  отключает SPA-фолбэк — для лендинга это и нужно; в проекте приложения `404.html` появляться
  не должен).
- CI: отдельная job `deploy-landing` в `ci.yml` (`npm run landing:build` →
  `wrangler pages deploy landing/dist --project-name stundio-landing`), запускается только при
  изменениях в `landing/**`. Решение и правка `ci.yml` — за архитектором (секреты те же).
- Plausible: отдельный сайт под адрес лендинга (настройка в аккаунте автора).

### 1.4 Запасной вариант: путь `/landing/` на том же origin

Возможен, если автор не хочет второй проект. Тогда **обязательно** до первого деплоя:

1. `public/sw.js`: в `fetch` не перехватывать навигации на `/landing/` —
   `if (url.pathname.startsWith("/landing")) return;` до ветки `navigate` (иначе F1).
2. Лендинг собирается отдельно и копируется в `dist/landing/` **после** `vite build`
   приложения (иначе F9: попадёт в `BUILD_ASSETS`). Capacitor всё равно скопирует его в APK —
   нужен `cap sync` из сборки без лендинга или удаление `dist/landing` перед `cap sync`.
3. Пути страниц `/landing/`, `/landing/ru/` …; `hreflang`/canonical с этим префиксом.

Это три правки в коде приложения ради лендинга — поэтому основной путь §1.3.

### 1.5 Что сломается, если лендинг займёт корень `stundio.pages.dev`

| # | Что ломается | Почему |
| --- | --- | --- |
| 1 | Установленные PWA (iPhone, desktop) открывают лендинг вместо приложения | `manifest.webmanifest`: `id`, `start_url`, `scope` = `/`. Смена `id` = для браузера это **другое** приложение: старые иконки на экране Домой осиротеют |
| 2 | Офлайн-запуск PWA показывает лендинг | SW прекэширует `/` как оболочку и перезаписывает её каждой навигацией (F1) |
| 3 | Тап по push-уведомлению ведёт на лендинг | `sw.js` `notificationclick` открывает `/?tab=day&date=…`; дефолт `url: "/"` |
| 4 | SPA-фолбэк и все абсолютные пути приложения | Приложению нужен новый `base` (`/app/`): `index.html` (`/manifest.webmanifest`, `/favicon.*`, `/icons/*`), `register("/sw.js")`, `PRECACHE_URLS`, `SHELL_URL`, legacy `/apple-touch-icon*.png` в корне |
| 5 | Web Push-подписки | Подписка привязана к регистрации SW; новый scope = новая регистрация → все подписки теряются, в KV остаются мёртвые записи |
| 6 | Данные пользователей, если приложение уедет на другой хост (`app.…`) | IndexedDB/localStorage привязаны к origin: кэш расписания, настройки, избранное, онбординг — заново |
| 7 | Внешние ссылки | README («Open stundio.pages.dev in Safari»), инструкции iPhone, `bit.ly/stundio` (QR на картинке недели), `google-site-verification` в `index.html`, сохранённые закладки |
| 8 | Ничего не ломается | `functions/` (`/download`, `/apk`, `/api-edupage`, `/api-push`) и cron `…/api-push/cron` — пути не пересекаются с лендингом |

**Как переключить позже, без поломок.** Двигать дёшево лендинг, дорого — приложение. Поэтому
корень `stundio.pages.dev` остаётся приложению навсегда, а «главным адресом» становится
**новый домен** для лендинга (свой домен на проекте `stundio-landing`). Переключение = DNS +
custom domain в Cloudflare + перенаправление `bit.ly/stundio` на лендинг (`02a` вопрос 1).
Если автор всё же захочет приложение в подпапке — это отдельный проект миграции по шести
пунктам выше (с периодом, когда SW на `/` отдаёт приложение и показывает баннер «переехали»),
а не часть лендинга.

---

## 2. Токены

### 2.1 Слои

```
primitive   src/ds/tokens/colors.css …        (--blue-500, --ink-900, --space-4)   не трогаем
semantic    src/ds/tokens/colors.css + dark   (--bg-app, --text-muted, --brand)     только алиасы
landing     landing/src/styles/tokens.css     (--l-*)                               здесь
component   внутри components/*.css           (--btn-h, --scene-p)                  локальные
```

Правила: компонентный CSS читает **только** `--l-*` и свои локальные переменные; `--l-*`
ссылаются на семантические DS-алиасы, а на primitive — только там, где DS-алиаса нет
(помечено «prim»). Сырые hex — нигде вне `colors.css`/`dark.css`. Новое значение без
DS-аналога помечено «new» и обосновано в 03a.

### 2.2 Цвет

| Токен | Светлая | Тёмная | Назначение |
| --- | --- | --- | --- |
| `--l-bg` | `var(--bg-app)` #f6f7fa | `var(--bg-app)` #0b0c10 | Фон страницы |
| `--l-surface` | `var(--surface-card)` #fff | #16181f | Карточки, сцены, FAQ |
| `--l-sunken` | `var(--surface-sunken)` #edeff4 | #101219 | Трек сегмента, трек прогресса, футер, блок учителей |
| `--l-text` | `var(--text-body)` #2a2d36 | #dde1ea | Основной текст |
| `--l-text-strong` | `var(--text-strong)` #0b0c10 | #fff | Заголовки, предмет в сцене |
| `--l-text-muted` | `var(--text-muted)` #5b6070 | #9ba2b4 | Вторичные строки, eyebrow, caption |
| `--l-link` | `var(--text-link)` #1730d6 | #7a8aff | Текстовые ссылки |
| `--l-link-hover` | `var(--text-link-hover)` #0f1fa0 | #adb9ff | hover ссылки |
| `--l-focus` | `var(--focus-ring)` #4a5cff | #b9bfce | Кольцо фокуса |
| `--l-now` | prim `var(--blue-500)` #1e3aff | prim `var(--blue-300)` #7a8aff | Кольцо «Tagad» в сцене — единственный электрик первого экрана. Паритет с приложением (F3) = `var(--brand)` в обеих темах |
| `--l-rail` | `var(--border-strong)` #b9bfce | #3a404f | Рейл секции (декоративный) |
| `--l-progress-track` | `var(--surface-sunken)` | #101219 | Трек прогресса |
| `--l-progress-fill` | `var(--brand)` #0b0c10 | #edeff4 | Заливка прогресса (как `LessonRow`) |
| `--l-btn-bg` | `var(--brand)` #0b0c10 | #edeff4 | Primary-кнопка |
| `--l-btn-fg` | `var(--text-on-brand)` #fff | #0b0c10 | Текст primary |
| `--l-btn-bg-hover` | prim `var(--ink-700)` | prim `var(--ink-200)` | hover primary (как `button.tsx`) |
| `--l-btn-ring` | `var(--text-strong)` | #fff | 2px inset-кольцо secondary |
| `--l-btn-tint` | `var(--surface-sunken)` | #101219 | hover secondary/ghost |
| `--l-field` | `var(--bg-hero)` #1e3aff | #1e3aff | Единственное синее поле (FinalCta) |
| `--l-on-field` | `var(--text-on-brand)`¹ #fff | prim `var(--white)` | Текст и кольцо фокуса на поле |
| `--l-field-btn-bg` | prim `var(--white)` | prim `var(--white)` | Кнопка `onField` |
| `--l-field-btn-fg` | prim `var(--ink-900)` | prim `var(--ink-900)` | Текст кнопки `onField` |
| `--l-cancel-bg` | `var(--status-danger)` #d92020 | #ff6b5e | Бейдж «Atcelta» в сцене |
| `--l-cancel-fg` | prim `var(--white)` | prim `var(--ink-900)` | Текст бейджа (F4) |
| `--l-accent-a` / `-ink` | prim `var(--accent-sky)` / `-ink` | те же | Предмет 1 в сценах (Index Rule) |
| `--l-accent-b` / `-ink` | prim `var(--accent-mint)` / `-ink` | те же | Предмет 2 |
| `--l-accent-c` / `-ink` | prim `var(--accent-lilac)` / `-ink` | те же | Предмет 3 |

¹ В тёмной DS `--text-on-brand` = ink-900 (для светлой brand-кнопки), поэтому на синем поле
берём явный white, иначе тёмный текст на синем.

### 2.3 Типографика, отступы, радиусы, тени, motion

```css
:root {
  /* type — роли из 03a §5 */
  --l-size-hero: clamp(40px, 11vw, var(--size-hero)); /* new: 40 на 360, 56 с ~510 px */
  --l-lh-hero: var(--lh-hero);
  --l-track-hero: var(--track-hero);
  --l-size-h2: var(--size-display-2);
  --l-weight-h2: var(--fw-bold);
  --l-lh-h2: var(--lh-display-2);
  --l-size-h3: var(--size-title);
  --l-size-lead: var(--size-body-lg);
  --l-size-body: var(--size-body);
  --l-size-caption: var(--size-caption);
  --l-type-eyebrow: var(--type-label); /* + letter-spacing: var(--track-label); uppercase */
  --l-type-time: var(--type-data); /* + tabular-nums */
  --l-measure: 60ch;

  /* space — только DS-шаги */
  --l-gutter: var(--gutter-screen); /* 20 */
  --l-gap-section: var(--space-16); /* 64 */
  --l-gap-block: var(--space-6); /* 24: текст → доказательство */
  --l-gap-text: var(--space-3); /* 12: eyebrow → h2 → lead */
  --l-gap-card: var(--gap-card); /* 12 */
  --l-header-h: var(--topbar-height); /* 56 */
  --l-tap: var(--tap-min); /* 44 */
  --l-col: var(--screen-max); /* 420: текстовая колонка */
  --l-container: 1120px; /* new, только ≥ 960 */
  --l-sticky-reserve: calc(54px + 2 * var(--space-4) + env(safe-area-inset-bottom));

  /* radius */
  --l-radius-control: var(--radius-pill);
  --l-radius-card: var(--radius-xl); /* 28: карточки, сцены, FAQ */
  --l-radius-callout: var(--radius-lg); /* 24 */
  --l-radius-shot: var(--radius-2xl); /* 36: скриншоты, FinalCta, блок учителей */
  --l-radius-cell: var(--radius-sm); /* 12: ячейки, номер шага */

  /* elevation — тёмные значения приходят из dark.css автоматически */
  --l-shadow-card: var(--shadow-card);
  --l-shadow-raised: var(--shadow-raised); /* скриншот в светлой */
  --l-shadow-sticky: var(--shadow-nav);
  --l-ring-hairline: var(--shadow-inset-hairline);

  /* motion */
  --l-dur-press: var(--dur-instant);
  --l-dur-ui: var(--dur-fast); /* hover, chevron FAQ */
  --l-dur-reveal: var(--dur-base); /* бейдж отмены, sticky */
  --l-dur-progress: calc(var(--dur-slow) * 2); /* ≈760 ms; при reduce → 2 ms */
  --l-ease: var(--ease-standard);
  --l-ease-out: var(--ease-out);
  --l-shift: var(--space-2); /* 8 px translate в паре с fade */
}

@media (min-width: 960px) {
  :root {
    --l-size-hero: clamp(64px, 6.25vw, 80px); /* new: 64 на 1024, 80 с 1280 */
    --l-size-h2: var(--size-display-1);
    --l-weight-h2: var(--fw-black);
    --l-lh-h2: var(--lh-display-1);
    --l-size-lead: 19px; /* new (03a §5) */
    --l-size-body: 16px; /* new */
    --l-gap-section: calc(var(--space-16) + var(--space-8)); /* 96 */
  }
}
```

Брейкпоинты — константы (в `@media` переменные не работают): **600** (пары карточек рядом,
кнопки нейтрального CTA в ряд с 400), **960** (две колонки, desktop-раскладка, без sticky и
вкладок). Высотный: `(max-height: 619px)` — компактная сцена в hero.

Текстовые правила (в `base.css`): `hyphens: manual`; h1/h2 — `text-wrap: balance`,
`overflow-wrap: anywhere`; абзацы — `text-wrap: pretty`; у заголовков нет `overflow: hidden`
(макроны в капсе); минимум текста 13 px, 11 px — только eyebrow.

### 2.4 Контраст (WCAG 2.2, рассчитано по значениям токенов)

Порог: текст 4.5:1, крупный текст (≥ 24 px или ≥ 18.66 px bold) и нетекстовые элементы 3:1.

**Тёмная тема**

| Пара | Ratio | Вердикт |
| --- | --- | --- |
| `--l-text` #dde1ea на `--l-bg` / на `--l-surface` | 14.92 / 13.53 | AAA |
| `--l-text-strong` #fff на `--l-bg` | 19.55 | AAA |
| `--l-text-muted` #9ba2b4 на bg / surface / sunken | 7.65 / 6.94 / 7.32 | AA |
| `--l-link` #7a8aff на bg / surface | 6.43 / 5.83 | AA |
| `--l-link-hover` #adb9ff на bg | 10.39 | AAA |
| `--l-now` #7a8aff кольцо на surface | 5.83 | ≥ 3:1 |
| Электрик #1e3aff кольцо на surface (если не заменить) | 2.62 | **провал** — поэтому `--l-now` переопределён |
| `--l-focus` #b9bfce на bg / surface | 10.62 / 9.63 | ≥ 3:1 |
| `--l-btn-fg` #0b0c10 на `--l-btn-bg` #edeff4; кнопка против bg | 16.99 / 16.99 | AAA |
| hover: #0b0c10 на #dde1ea | 14.92 | AAA |
| `--l-btn-ring` #fff на bg (secondary) | 19.55 | ≥ 3:1 |
| `--l-progress-fill` #edeff4 на трек #101219 | 16.26 | ≥ 3:1 |
| Трек #101219 против surface | 1.06 | декоративный (F6) |
| `--l-cancel-fg` #0b0c10 на #ff6b5e | 7.00 | AA (белый был бы 2.79 — провал, F4) |
| Отмена: название предмета 55 % (#96979a на surface), 22 px bold | 6.07 | AA |
| Отмена: caption 55 % (#5f6471 на surface) | 3.00 | **провал** → метаданные не гасим (F5) |
| Акценты-рейлы (sky #9cc8f7) на surface | 10.15 | ок |
| Пары акцент/ink (sky, mint, lilac, amber) | 6.04–7.10 | AA |
| `--l-on-field` #fff на `--l-field` #1e3aff | 6.76 | AA |
| Край синего поля против bg #0b0c10 | 2.89 | декоративный край, не элемент управления |
| Hairline #262a35 / border-strong #3a404f на bg | 1.36 / 1.89 | только декор (рейл), не граница контрола |

**Светлая тема (дополнение к 03a §4)**

| Пара | Ratio | Вердикт |
| --- | --- | --- |
| `--l-now` #1e3aff на surface | 6.76 | ≥ 3:1 |
| `--l-focus` #4a5cff на surface / bg | 4.92 / 4.60 | ≥ 3:1 |
| `--l-link` #1730d6 на surface | 8.64 | AAA |
| `--l-text-muted` на `--l-sunken` (футер, блок учителей) | 5.45 | AA |
| `--l-progress-fill` #0b0c10 на трек #edeff4 | 16.99 | ≥ 3:1 |
| `--l-btn-ring` #0b0c10 на bg | 18.25 | ≥ 3:1 |
| `--l-cancel-fg` #fff на #d92020 | 5.03 | AA |
| Отмена: предмет 55 % (#79797c на #fff), 22 px bold | 4.34 | AA крупный |
| Отмена: caption 55 % (#a5a8b0) | 2.38 | **провал** → не гасим (F5) |
| Акцент-рейлы на белом (sky / mint / lime) | 1.75 / 1.48 / 1.23 | только индекс; предмет назван текстом |

---

## 3. Компоненты

Общее для всех:

- Класс-префикс `l-`, БЭМ-подобные модификаторы (`l-btn--primary`). Хуки JS — только
  `data-*`, никогда классы.
- **Фокус:** `:focus-visible { outline: 2px solid var(--l-focus); outline-offset: 2px }`
  глобально; на синем поле — `--l-on-field`. Кольцо не убирается никогда.
- **Нажатие:** `transform: scale(var(--press-scale))` на `:active`, `transition:
  var(--transition-press)`. Цвет при нажатии не меняется.
- **Hover** — только под `@media (hover: hover)`; на телефоне hover-состояний нет.
- **Reduced motion:** DS-токены уже схлопываются до 1 ms; плюс бэкстоп в `base.css`:
  `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation: none !important;
  transition: none !important } }`. Финальное состояние любой анимации — дефолт в CSS/HTML.
- **No-JS:** `<html>` без класса `js` — состояние по умолчанию. Всё, что зависит от JS,
  включается селектором `.js …` или атрибутом, который ставит скрипт.
- **Иконки** — Lucide (ISC), 2 px stroke, 24-сетка, инлайн `<svg>` из `landing/src/icons/`,
  `aria-hidden="true" focusable="false"`, `stroke="currentColor"`. Размер привязан к контексту
  (16/18/20 в кнопках sm/md/lg, 14 в метаданных, 20 в фактах). Без эмодзи и юникод-символов.
- **Touch:** любой интерактивный элемент ≥ 44 × 44 px; между соседними целями ≥ 8 px.

Ниже «360» = размеры на ширине 360 px (контент 320 px).

### 3.1 SkipLink

- **Назначение.** Первый фокус страницы, прыжок к `<main id="main">`.
- **Разметка.** `<a class="l-skip" href="#main">Pāriet uz saturu</a>` первым в `body`.
- **Состояния.** Скрыт визуально (`sr-only`-приём, не `display:none`); на `:focus-visible` —
  primary-пилюля 44 px в левом верхнем углу поверх шапки.
- **Секции.** Глобально.

### 3.2 Header + LangSwitch

- **Назначение.** Бренд и смена языка. Не навигация, не sticky (DS One Fixed Thing).
- **Разметка.**

```html
<header class="l-header">
  <a class="l-brand" href="#top">
    <svg class="l-brand__mark" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M52.8971 63.3499C18.3191 …Z" />
    </svg>
    <span class="l-brand__name">Stundio</span>
  </a>
  <nav class="l-lang" aria-label="Valoda">
    <ul>
      <li><a href="/" hreflang="lv" lang="lv" aria-current="page">LV<span class="sr-only"> Latviešu</span></a></li>
      <li><a href="/ru/" hreflang="ru" lang="ru">RU<span class="sr-only"> Русский</span></a></li>
      <li><a href="/en/" hreflang="en" lang="en">EN<span class="sr-only"> English</span></a></li>
      <li><a href="/ua/" hreflang="uk" lang="uk">UA<span class="sr-only"> Українська</span></a></li>
    </ul>
  </nav>
</header>
```

  Доступное имя «LV Latviešu» содержит видимую подпись (WCAG 2.5.3 Label in Name).
  `aria-label` у `nav` — на языке страницы. Ссылка `l-brand` — имя «Stundio» из текста.
- **Вид.** Высота `--l-header-h` 56. Mark 20 × 30 px `--l-text-strong` + «Stundio» Manrope 800
  20 px, трекинг `--track-hero`. Переключатель — DS segmented: трек `--l-sunken`, padding 4,
  четыре ссылки по 44 × 44 (визуальная пилюля 36 px внутри), текущая — белая пилюля
  (`--l-surface`) с `--l-shadow-card`, остальные `--l-text-muted` 700 13 px. Ширина 184 px.
- **Варианты.** `--compact` (< 360 px): слово «Stundio» скрыто визуально (остаётся в имени
  ссылки), mark остаётся — иначе 184 + 108 > 280 px.
- **Состояния.** default / hover (текст `--l-text-strong`) / focus (кольцо вокруг 44-px ссылки)
  / current (`aria-current="page"`, белая пилюля, не ссылка-«пустышка»: ведёт на себя же) /
  active (scale) / reduced-motion (без изменений) / no-JS (обычные ссылки, работает полностью).
- **JS (улучшение).** При клике переносит текущий `location.hash` в ссылку языка
  (02a §5: «сохраняется якорь»), пишет выбор в `localStorage` (`l-lang`, в try/catch), шлёт
  событие `Lang Switch`. Анимации смены языка нет.
- **360.** 56 px по высоте; бренд ≈ 108 px + переключатель 184 px ≤ 320 px.
- **Секции.** `header`. Полные названия языков — в Footer (§3.15).

### 3.3 Button

- **Назначение.** Все действия и CTA-ссылки. На лендинге это почти всегда `<a>` (переход,
  загрузка, якорь); `<button>` — только для действий на месте (копировать адрес, opt-out,
  переключение платформы с JS).
- **Разметка.** `<a class="l-btn l-btn--primary l-btn--lg" href="https://stundio.pages.dev/download"
  data-cta="apk"><svg …/>Lejupielādēt APK</a>`. Иконка — первым ребёнком, `aria-hidden`.
- **Варианты (вид).**

| Вариант | Фон | Текст | Кольцо/тень | Где |
| --- | --- | --- | --- | --- |
| `primary` | `--l-btn-bg` | `--l-btn-fg` | `--l-shadow-card` | Главная кнопка платформы, sticky |
| `secondary` | transparent | `--l-text-strong` | inset 2px `--l-btn-ring` | Вторичные действия рядом с primary |
| `ghost` | transparent | `--l-text-strong` | — | «Копировать адрес», opt-out |
| `onField` | `--l-field-btn-bg` | `--l-field-btn-fg` | — | Только на синем поле FinalCta |
| `link` | — | `--l-link`, подчёркнут, offset 3 px | — | Текстовые выходы («Kā instalēt, 4 soļi») |

  Синих кнопок нет (DS Neutral Button Rule). `link` — текст, не пилюля, но его
  интерактивная область — `inline-flex; min-height: 44px; align-items: center`.

- **Размеры.** `lg` 54 px, padding 0 26, текст 16/600, иконка 20 — CTA. `md` 44 px, padding
  0 20, 15/600, иконка 18 — вторичное. `sm` не используется (меньше 44). `--block` — ширина
  100 % колонки (CTA на телефоне).
- **Контент-варианты CTA** (иконка + подпись, текст — 2.2):

| Платформа | Иконка Lucide | Подпись (смысл) | Куда |
| --- | --- | --- | --- |
| Android | `download` | Lejupielādēt APK | `https://stundio.pages.dev/download` |
| iPhone | `smartphone` | Atvērt Stundio | `https://stundio.pages.dev/` |
| Компьютер | `monitor` | Atvērt pārlūkā | `https://stundio.pages.dev/` |
| Нейтральные (no-JS) | `download` / `smartphone` | Android — APK / iPhone — kā instalēt | `/download` / `#install-ios` |
| К установке | `arrow-down` | Instalēt | `#install-<платформа>` |

- **Состояния.**

| Свойство | default | hover (hover:hover) | focus-visible | active | disabled | reduced-motion | no-JS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| primary фон | btn-bg | btn-bg-hover | как default + кольцо | scale .97 | не используется² | scale 1 | работает (ссылка) |
| secondary фон | transparent | btn-tint | + кольцо | scale .97 | — | scale 1 | работает |
| link | link-цвет, underline | link-hover | + кольцо | — | — | — | работает |

  ² Если понадобится (например, «Скопировано» на 2 с) — DS: `opacity .38`,
  `pointer-events: none`, `aria-disabled="true"`; для `<a>` disabled не применяется.
- **a11y.** Имя = видимый текст; внешние адреса открываются в той же вкладке (никаких
  `target="_blank"` и `window.open`, 03a §7). `data-cta` + `data-place` — для аналитики.
- **360.** `lg --block` = 320 × 54. Текст не переносится (`white-space: nowrap`); если
  подпись 2.2 не помещается в 320 − 52 − 30 ≈ 238 px при 16/600 — сокращать подпись.
- **Секции.** `#top`, `#install`, FinalCta, StickyCta, Footer.

### 3.4 DeviceCta (логика под устройство)

- **Назначение.** «Одна кнопка под мой телефон» (02a §2) + микротекст против главного страха
  + вторичные выходы. Используется в Hero, FinalCta и (в урезанном виде) в StickyCta.
- **Принцип.** В HTML лежат **все наборы**, видим один. Платформа ставится inline-скриптом в
  `<head>` до первой отрисовки (`<html data-platform="android|ios|desktop">`), поэтому нет
  вспышки нейтрального состояния и нет сдвига. Без JS атрибута нет → виден нейтральный набор.
- **Детекция** — копия правил `src/ui/lib/platform.ts` (`/Android/i`; `/iPhone|iPad|iPod/i`
  или `MacIntel` + `maxTouchPoints > 1`; иначе desktop). Для QA — переопределение
  `?platform=android|ios|desktop`. Расхождение с приложением недопустимо: 3.3 добавляет тест
  на одинаковые результаты по набору UA-фикстур.
- **Разметка.**

```html
<div class="l-cta" data-device-cta data-place="hero">
  <div class="l-cta__set" data-set="neutral">
    <a class="l-btn l-btn--primary l-btn--lg l-btn--block" href="https://stundio.pages.dev/download" data-cta="apk">…Android — APK</a>
    <a class="l-btn l-btn--primary l-btn--lg l-btn--block" href="#install-ios" data-cta="install_jump">…iPhone</a>
    <p class="l-cta__micro">…Nav Google Play — Android brīdinās par avotu.</p>
    <a class="l-btn l-btn--link" href="https://stundio.pages.dev/" data-cta="open_web">Atvērt pārlūkā</a>
  </div>
  <div class="l-cta__set" data-set="android">
    <a class="l-btn l-btn--primary l-btn--lg l-btn--block" href="https://stundio.pages.dev/download" data-cta="apk">…Lejupielādēt APK</a>
    <p class="l-cta__micro">Nav Google Play. Android brīdinās par avotu — tas ir normāli.</p>
    <p class="l-cta__links">
      <a class="l-btn l-btn--link" href="#install-android">Kā instalēt, 4 soļi</a>
      <a class="l-btn l-btn--link" href="#install-ios" data-platform-switch="ios">Man ir iPhone</a>
    </p>
    <div class="l-after" data-after-apk hidden>…StepList compact…</div>
  </div>
  <div class="l-cta__set" data-set="ios">…Atvērt Stundio · micro «Caur Safari, bez App Store. Logrīku iPhone nav.» · Kā instalēt · Man ir Android</div>
  <div class="l-cta__set" data-set="desktop">…Atvērt pārlūkā · QrCard (≥ 960) · Android APK (link)</div>
  <p class="l-cta__inapp">Nelejupielādējas? Atver šo lapu telefona pārlūkā: <span class="l-url">stundio-landing.pages.dev</span>
    <button class="l-btn l-btn--ghost l-btn--md" type="button" data-copy-url hidden>Kopēt adresi</button></p>
</div>
```

  CSS: `.l-cta__set { display: none }`, `.l-cta__set[data-set="neutral"] { display: grid }`,
  `[data-platform="android"] .l-cta__set[data-set="android"] { display: grid }` и
  `[data-platform] .l-cta__set[data-set="neutral"] { display: none }`. Скрытые наборы через
  `display: none` выпадают из дерева доступности — дублей для скринридера нет.
- **Переключение «Man ir iPhone / Android».** С JS: `preventDefault`, смена
  `data-platform`, запоминание в `sessionStorage`, фокус на primary нового набора, событие
  `Platform Override`. Без JS: обычный якорь в `#install-ios` / `#install-android`.
- **Панель «Kas tālāk» (только JS, только Android).** Клик по APK не перехватывается
  (загрузка идёт как обычно); параллельно снимается `hidden` с `[data-after-apk]` — компактный
  StepList из 4 шагов (тот же источник текста, что в `#install-android`). Обёртка
  `role="status"` с видимым заголовком «Kas tālāk», без переноса фокуса (системный диалог
  загрузки важнее). Появление — fade + translate `--l-shift`, `--l-dur-reveal`.
- **Строка для встроенных браузеров** видна всегда (02a §4). Кнопка «Kopēt adresi» — только с
  JS (`hidden` снимается скриптом), без JS адрес остаётся текстом. После копирования — текст
  кнопки меняется на «Nokopēts» на 2 с, плюс `role="status"`-сообщение.
- **Строка доверия** «Им уже пользуются 200+ человек, включая учителей» (`01c#20`, дословно,
  без иконок) — сразу под набором, одна для всех платформ, caption `--l-text-muted`.
- **Состояния.** default (по платформе) / no-JS (нейтральный) / после клика APK (+ панель) /
  reduced-motion (панель появляется без движения) / focus и hover — у Button.
- **360.** Нейтральный: две кнопки 54 + 12 + 54 = 120 px, затем micro ≈ 36 и ссылка 44. С 400 px
  кнопки в ряд. Android-набор: 54 + 8 + micro 36 + links 44 ≈ 142 px (в бюджете hero 03a §3.2).
- **Секции.** `#top`, FinalCta; логика платформы — общая со StickyCta и InstallTabs.

### 3.5 Hero

- **Назначение.** За 5 секунд: «это оно», «что даёт», «что нажать» (02a §1.1).
- **Разметка.**

```html
<section class="l-hero" id="top" aria-labelledby="top-h">
  <p class="l-eyebrow">Stundu saraksts · RVT</p>
  <h1 id="top-h" class="l-hero__title">…</h1>
  <p class="l-hero__lead">…bez interneta, bez pieteikšanās.</p>
  <p class="l-hero__source">Tavas grupas saraksts no RVT publiskā saraksta.</p>
  <!-- NowNextScene (§3.8) -->
  <!-- DeviceCta (§3.4) -->
</section>
```

  Порядок по 03a §3.2: шапка → eyebrow → H1 → lead → сцена → CTA → micro. (02a ставил визуал
  после CTA; 03a, утверждённое позже, ставит компактную сцену **над** CTA. Если по замеру на
  LV/RU при системном шрифте CTA уходит ниже 520 px — сцена переезжает под CTA, а не
  сокращается кнопка.)
- **Вид.** H1 — `--l-size-hero`, 800, lh `--l-lh-hero`, трекинг `--l-track-hero`,
  `--l-text-strong`. Lead — `--l-size-lead` 500 `--l-text`. Source — caption muted. Отступ от
  шапки 16, ритм `--l-gap-text`, перед сценой `--l-gap-block`.
- **Варианты.** `default`; `short-viewport` (`max-height: 619px`) — сцена в компактной форме;
  `desktop` (≥ 960) — сетка 6/6: слева текст + DeviceCta, справа сцена + QrCard.
- **Состояния.** Статичный блок; LCP — H1. Шрифт с `font-display: swap` и подогнанными
  метриками фолбэка (`size-adjust`, `ascent-override` для Roboto/SF/Arial — посчитать в 3.3
  по метрикам Manrope) — swap не двигает CTA. no-JS — нейтральный DeviceCta.
- **a11y.** Единственный `h1`. Eyebrow — `<p>`, не заголовок.
- **360.** Сумма ≈ 430–500 px (03a §3.2), CTA в первых 520 px на LV и RU.
- **Секции.** `#top`.

### 3.6 Eyebrow и SectionHeading

- **Eyebrow:** `<p class="l-eyebrow">` — `--l-type-eyebrow`, `letter-spacing: var(--track-label)`,
  `text-transform: uppercase`, `--l-text-muted`. Только 11 px (DS Eyebrow Rule).
- **SectionHeading** (внутри QuestionSection): вопрос и ответ — **один** `h2`, чтобы навигация
  по заголовкам читала и вопрос, и ответ:

```html
<h2 class="l-q__heading" id="now-h">
  <span class="l-eyebrow">Kas tagad?</span>
  <span class="l-q__answer">Nākamā stunda, kabinets un ēka — uzreiz</span>
</h2>
```

  Капс делает CSS, поэтому скринридер читает «Kas tagad?» обычным регистром.

### 3.7 QuestionSection (шаблон «вопрос → ответ»)

- **Назначение.** Каркас всех секций-вопросов (03a §3.0, концепция «Вопросы из коридора»).
- **Разметка.**

```html
<section class="l-q" id="now" aria-labelledby="now-h">
  <div class="l-q__head">
    <span class="l-q__rail" aria-hidden="true"></span>
    <h2 class="l-q__heading" id="now-h">…eyebrow + answer…</h2>
  </div>
  <p class="l-q__lead">…1–2 строки…</p>
  <div class="l-q__proof">…компонент-доказательство…</div>
  <p class="l-q__exit"><a class="l-btn l-btn--link" href="#install">Instalēt</a></p>
</section>
```

- **Вид.** `l-q__head` — grid `4px 1fr`, gap 12: слева 4-px pill-рейл `--l-rail` во всю высоту
  заголовка (как рейл lesson card), справа eyebrow → 12 → ответ (`--l-size-h2`,
  `--l-weight-h2`, `--l-lh-h2`, `--track-display`, `--l-text-strong`). Lead — `--l-size-lead`,
  отступ 12–16. Proof — через `--l-gap-block`. Между секциями `--l-gap-section`.
  `scroll-margin-top: var(--space-4)` (шапка не sticky) и `scroll-margin-bottom` под sticky.
- **Варианты.** `--subject` (рейл берёт `--l-accent-*`, только если секция показывает конкретный
  предмет); `--panel` (весь блок на `--l-sunken`, radius `--l-radius-shot`, padding 24 —
  TeachersBlock); `--wide` (≥ 960: заголовок + текст слева, proof справа).
- **Состояния.** Статичный. reduced-motion / no-JS — без отличий (scroll-reveal запрещён, 03a §6).
- **a11y.** `section` + `aria-labelledby` → ориентир «регион» с именем. Рейл `aria-hidden`.
- **360.** Заголовок ≤ 3 строк при 30 px; длинные LV/RU-слова — ограничение для 2.2 (03a §5).
- **Секции.** `#now`, `#changes`, `#offline`, `#install`, `#teachers`, `#more`, `#faq`.

### 3.8 NowNextScene (HTML/CSS-сцена виджета)

- **Назначение.** Доказательство главной работы «сейчас / дальше» без поддельного
  скриншота (03a §3.4). Анатомия — из `widget_next_lesson.xml` и `LessonRow.tsx`.
- **Сценарий (фиксированный, `landing/src/content/scene.ts`, одинаковый для всех языков,
  кроме подписей):** «Tagad» — Programmēšana, 10:10–10:50, kab. 214 · Galvenā ēka,
  `vēl 19 min`, прогресс 0.525 (21 из 40 мин); «Nākamā» — Angļu valoda, 10:55, kab. 3 · TIC,
  `pēc 5 min`. Названия предметов — реальные LV-названия из DESIGN.md; кабинеты условные;
  **имён преподавателей нет**; к часам посетителя не привязано.
- **Разметка.**

```html
<figure class="l-scene">
  <div class="l-scene__card" role="img"
       aria-label="Ilustrācija, piemērs. Tagad: Programmēšana, 10:10–10:50, 214. kabinets, Galvenā ēka, vēl 19 minūtes. Nākamā: Angļu valoda 10:55, 3. kabinets, TIC.">
    <div class="l-scene__row l-scene__row--now" style="--p: .525; --rail: var(--l-accent-a)">
      <span class="l-scene__rail"></span>
      <span class="l-scene__body">
        <span class="l-eyebrow">Tagad</span>
        <span class="l-scene__subject">Programmēšana</span>
        <span class="l-scene__meta"><svg …map-pin/>214 · Galvenā ēka</span>
      </span>
      <span class="l-scene__time"><span class="l-time">10:10–10:50</span><span class="l-time">vēl 19 min</span></span>
      <span class="l-progress"><span class="l-progress__fill"></span></span>
    </div>
    <div class="l-scene__row" style="--rail: var(--l-accent-b)">…Nākamā…</div>
  </div>
  <figcaption class="l-scene__caption">
    <span class="l-pill"><svg …image/>Ilustrācija · piemērs</span>
    <span>Uz Android tas pats ir sākuma ekrāna logrīkā.</span>
  </figcaption>
</figure>
```

  Дети `role="img"` для AT презентационны — содержание целиком в `aria-label` (на языке
  страницы). Плашка «Ilustrācija · piemērs» — **видимый текст** в `figcaption`, вне `role=img`.
- **Вид.** Карточка `--l-surface`, `--l-radius-card`, `--l-shadow-card`, padding 12, две
  строки-карточки с gap 8. Строка: grid `4px 1fr auto`, gap 10 (как виджет: рейл 4 px, отступ
  10). Eyebrow 11; предмет 17/700 `--l-text-strong` (виджет 17 sp); мета 13/500 muted (виджет
  12 sp → поднято до минимума страницы 13); время — `--l-type-time`, `tabular-nums`, справа.
  Строка «Tagad» — `box-shadow: inset 0 0 0 2px var(--l-now)`, radius `--radius-lg` (24).
  Прогресс: абсолютно снизу строки, `inset-inline: 16px; bottom: 8px; height: 4px`, трек
  `--l-progress-track`, заливка `--l-progress-fill`, `transform: scaleX(var(--p))`,
  `transform-origin: left`. Анимируется только `transform`.
- **Варианты.** `default` (две строки, ≈ 150 px); `--compact` (hero при `max-height: 619px`:
  только «Tagad» + прогресс, ≈ 72–80 px; строка «Nākamā» скрыта `display: none` по media).
  `aria-label` в обоих вариантах один и тот же, полный: текстовая альтернатива может быть
  подробнее картинки, а дублировать разметку ради лейбла не стоит. `--desktop` (≥ 960,
  ширина 380, анатомия та же).
- **Motion (сюжет 1).** Рост прогресса **чистым CSS**, без JS:

```css
@media (prefers-reduced-motion: no-preference) {
  .l-progress__fill { animation: l-grow var(--l-dur-progress) var(--l-ease-out) both; }
}
@keyframes l-grow { from { transform: scaleX(0); } }
```

  Финальное значение — объявленный `scaleX(var(--p))`; без анимаций (reduce, no-JS, старый
  браузер) полоса сразу заполнена. Цифры отсчёта не крутятся. Один раз, без циклов.
- **Состояния.** default / reduced-motion (статично) / no-JS (идентично, анимация на CSS) /
  тёмная (`--l-now` = blue-300, заливка ink-100) / hover-focus — нет (не интерактивна, не в
  tab order).
- **360.** Ширина 320, высота ≈ 150 (default) / ≈ 76 (compact). Предмет `text-overflow:
  ellipsis` в одну строку (как `maxLines=1` виджета), время не сжимается.
- **Секции.** `#top` (обязательно), `#now` (рядом с WidgetList на desktop — опционально, без
  повторной анимации).

### 3.9 ChangesScene (замена на месте урока)

- **Назначение.** Показать «отменённый урок остаётся на месте, зачёркнутым» (`01c` §4.1 №2).
  Иллюстрация разрешена 03a §3.4 при видимой пометке; 02a допускал её при условных данных.
- **Сценарий.** Три урока подряд в анатомии DS lesson card (время-рейл слева: старт 700 mono,
  конец 12 px muted; круг номера урока 40 px с акцентом; предмет 22/700; мета 13). Средний —
  отменён: бейдж «Atcelta» (`--l-cancel-bg/-fg`, 22 px pill, 11/700 капс), время и предмет
  `opacity: .55` + зачёркивание; **метаданные — полный muted-контраст и зачёркнуты** (F5,
  отступление от DS ради AA, записать в 3.6). Предметы — реальные LV-названия, кабинеты
  условные, без преподавателей. Под сценой — та же Pill «Ilustrācija · piemērs» и SourcePill
  «Teksts no skolas — bez tulkojuma» (смысл `01c#7`, текст 2.2).
- **Разметка.** `<figure class="l-changes" data-changes-anim>` → `<ol class="l-changes__list"
  role="img" aria-label="Ilustrācija, piemērs: trīs stundas; otrā — Matemātika — atcelta un
  paliek savā vietā, pārsvītrota.">` → три `<li class="l-lesson">`, средний с
  `l-lesson--cancelled`. Зачёркивание — псевдоэлемент `::after` (линия 2 px `currentColor`,
  `transform: scaleX(1)`, origin left) на времени и предмете, чтобы его можно было «провести».
- **Motion (сюжет 2, JS).** `changes-anim.ts`: если `prefers-reduced-motion: no-preference`
  **и** сцена при инициализации **вне** вьюпорта — ставит `data-anim="armed"` (CSS: opacity 1,
  линия `scaleX(0)`, бейдж `opacity:0; translateY(var(--l-shift))`); IntersectionObserver
  (threshold 0.6, один раз) → `data-anim="run"` → переход в финальное состояние:
  opacity `--l-dur-reveal`, линия `--l-dur-reveal` с задержкой `--dur-fast`, бейдж fade +
  translate. Если сцена уже видна при загрузке, скрипт упал или JS нет — она сразу в
  финальном (отменённом) состоянии. Наблюдатель отключается после срабатывания.
- **Состояния.** final (default) / armed / run / reduced-motion = final / no-JS = final / тёмная.
- **360.** 3 × ≈ 92 + 2 × 12 ≈ 300 px.
- **Секции.** `#changes`.

### 3.10 ScreenshotFrame

- **Назначение.** Реальный скриншот как «экран-карточка» без рамки устройства (03a §3.3).
- **Разметка.**

```html
<figure class="l-shot">
  <picture>
    <source type="image/avif" srcset="/img/week-view.avif 1x">
    <source type="image/webp" srcset="/img/week-view.webp 1x">
    <img src="/img/week-view.png" width="253" height="522" loading="lazy" decoding="async"
         alt="Nedēļas skats: grupas DP2-1 stundas pa dienām, priekšmeti ar krāsainiem kodiem.">
  </picture>
  <figcaption class="l-shot__caption">Nedēļas skats: visa nedēļa vienā ekrānā.</figcaption>
</figure>
```

  Когда появятся 2×/3× и светлые снимки: `srcset` 1x/2x/3x и `<source media="(prefers-color-scheme: dark)">`.
- **Вид.** `border-radius: var(--l-radius-shot)`, `overflow: hidden` на `picture` (не на
  `figure`), светлая — `--l-shadow-raised`, тёмная — `--l-ring-hairline` + тень из dark.css.
  Ширина ≤ нативной (сейчас **253 CSS px**, 03a §3.3) и ≤ 260 на телефоне, 300 на desktop при
  наличии 3× исходников. `aspect-ratio` из `width/height` → CLS 0. Центрирована в колонке.
- **Допуск ассетов (на сборке).** Allowlist в `scene.ts`/конфиге: сейчас только
  `week-view` (на `day-view`, `subjects-view`, баннере — имена преподавателей, 02a §0). Попытка
  отрендерить файл не из allowlist — ошибка сборки.
- **Заглушка, если ассета нет.** Сборка проверяет наличие файлов. **Production:** фрейм не
  рендерится вовсе, секция живёт текстом (02a: «текстовый вариант честнее»). **Dev/preview**
  (`LANDING_PLACEHOLDERS=1`): карточка `--l-sunken` того же размера, иконка `image-off` 20,
  caption «Trūkst kadra A — Dienas skats ar pašreizējo stundu» (ID съёмки из 02a §0) —
  чтобы дыры были видны ревьюеру 3.4, но никогда не уезжали в прод.
- **Состояния.** loading (место зарезервировано, фон `--l-sunken`) / loaded / error (alt
  виден, фон остаётся) / reduced-motion, no-JS — без отличий.
- **a11y.** `alt` описывает содержание, не «screenshot»; caption — видимая подпись.
- **360.** 253 × 522 + caption ≈ 560 px — это целый экран; поэтому в `#now` скриншот идёт
  **после** фактов и WidgetList, не перед ними.
- **Секции.** `#now` (week-view). Позже: `#changes` (съёмка A), `#teachers` (D), `#install-ios` (C).

### 3.11 InstallTabs

- **Назначение.** Три пути установки (02a §1.5). Без JS — все три подряд; с JS на < 960 —
  вкладки; на ≥ 960 — три колонки без вкладок.
- **Разметка (базовая, no-JS).**

```html
<div class="l-install" data-install-tabs>
  <div class="l-install__tabs" role="tablist" aria-label="Ierīce" hidden>
    <button role="tab" id="tab-android" aria-controls="install-android" aria-selected="true">Android</button>
    <button role="tab" id="tab-ios" aria-controls="install-ios" aria-selected="false" tabindex="-1">iPhone</button>
    <button role="tab" id="tab-desktop" aria-controls="install-desktop" aria-selected="false" tabindex="-1">Dators</button>
  </div>
  <section class="l-install__panel" id="install-android" aria-labelledby="install-android-h">
    <h3 id="install-android-h">Android</h3> …
  </section>
  <section … id="install-ios">…</section>
  <section … id="install-desktop">…</section>
</div>
```

- **Улучшение (JS, `install-tabs.ts`).** Только при `matchMedia("(max-width: 959px)")`;
  слушает `change` и при переходе через 960 разбирает/собирает вкладки обратно. Включение:
  снять `hidden` с tablist, панелям — `role="tabpanel"`, `aria-labelledby` → вкладка, `hidden`
  у невыбранных, `h3` внутри панелей визуально скрыть (имя даёт вкладка). Выбор по умолчанию:
  `location.hash` (`#install-ios` и т. п.) → иначе `data-platform` → иначе Android. Клавиатура
  — ARIA APG tabs: ←/→ (по кругу), Home/End, автоматическая активация, roving tabindex.
  `hashchange` и клики по ссылкам `#install-*` где угодно на странице переключают вкладку и
  прокручивают к `#install`. Смена вкладки → `history.replaceState` с новым хешем, событие
  `Install Tab`. (Здесь `tablist`, а не DS-`radiogroup`: сегменты переключают панели.)
- **Вид.** Таблист — DS segmented: трек `--l-sunken`, padding 4, вкладки по 44 px высотой
  (визуальная пилюля 36), выбранная — `--l-surface` + `--l-shadow-card`, `--l-text-strong`;
  остальные — muted 700. Ширина 100 %, вкладки поровну (3 × ≈ 104 px на 360). Панель —
  без карточки (контент на `--l-bg`), отступ сверху 24.
- **Состав панелей** (порядок — 02a §1.5): Android: Callout `apk` (дисклеймер 3) → Button APK
  → StepList (4) → FactList (обновления сами, открытый код MIT + Releases) → Callout `quiet`
  («молодой проект») → link «Vispirms pārlūkā». iPhone: строка «Nav App Store, caur Safari» →
  Button «Atvērt Stundio» → StepList (Safari → Kopīgot → Pievienot sākuma ekrānam → atvērt) →
  строка «Lietotne pati parādīs šos soļus» → FactList различий (нет виджетов; уведомления только
  после экрана Домой) + статичная строка «Soļi strādā Safari» (видна всегда). Компьютер:
  Button «Atvērt pārlūkā» → QrCard (только ≥ 960; на телефоне скрыт) + адрес текстом.
- **Состояния.** no-JS (три секции подряд с `h3`) / tabs (одна видима) / focus (кольцо на
  вкладке) / hover вкладки (`--l-text-strong`) / active (scale) / reduced-motion (смена панели
  без анимации — анимации нет и так) / desktop (3 колонки, таблиста нет).
- **360.** Таблист 52 px; панель Android ≈ 1.3–1.6 экрана.
- **Секции.** `#install`.

### 3.12 StepList

- **Назначение.** Нумерованные шаги установки; та же разметка в панели «Kas tālāk» (02a §2.3).
- **Разметка.** `<ol class="l-steps"><li class="l-steps__item"><span class="l-steps__title">Atver
  lejupielādēto failu</span><span class="l-steps__hint">no paziņojuma vai «Lejupielādes»</span></li>…</ol>`.
  Номер — CSS-счётчик (`counter-reset`/`::before`), его прочитает скринридер как номер списка.
  Названия системных кнопок — в «ёлочках» по словарю приложения (`iphoneInstall.*`,
  `day.androidBanner.*`), иконка «Поделиться» (`share`) рядом с текстом — допускается
  (02a §1.5), интерфейс iOS/Android не перерисовываем.
- **Вид.** Grid `32px 1fr`, gap 12; номер — круг 32 px `--l-sunken`, `--l-text-strong`
  700 15 px (не mono: это не время); title — body 600 `--l-text`; hint — caption muted.
  Между шагами 12. Без соединительных линий.
- **Варианты.** `default`; `--compact` (панель «Kas tālāk»: номер 24, без hint).
- **Состояния.** Статичный; reduced-motion / no-JS — без отличий.
- **360.** 4 шага ≈ 4 × 52 + 3 × 12 ≈ 244 px.
- **Секции.** `#install` (Android, iPhone), DeviceCta (панель после APK).

### 3.13 Callout / Disclaimer и SourcePill

**Callout** — важный текст в потоке, не мелкий шрифт.

- **Разметка.** `<div class="l-callout l-callout--apk" role="note"><svg …shield-check/><div><p
  class="l-callout__title">Nav Google Play</p><p>APK no GitHub Releases. Android brīdinās, ka avots
  nav zināms — tas ir sagaidāms. Instalē tikai failu no stundio.pages.dev/download vai Releases
  lapas.</p></div></div>`.
- **Варианты.**

| Вариант | Фон | Иконка | Где | Текст-источник |
| --- | --- | --- | --- | --- |
| `apk` | `--l-surface` + `--l-ring-hairline` | `shield-check` 20, `--l-text-strong` | **до** кнопки APK в `#install-android`; короткая версия — над кнопкой FinalCta | `01c` дисклеймер 3 |
| `ios` | `--l-surface` + hairline | `info` | `#install-ios`, `#now` («На iPhone виджетов нет», видна всем) | `01c` дисклеймер 6, `01c#3` |
| `quiet` | `--l-sunken` | — | «Приложение ещё молодое…» | `01c` дисклеймер 5 |
| `legal` | без фона, caption | — | Footer | `01c` дисклеймеры 1, 2, 4 |

  Статусные цвета (warning/danger) не используются: DS резервирует их за состоянием
  синхронизации и уроков. Иконка + заголовок 600 + текст body; radius `--l-radius-callout`,
  padding 16, grid `20px 1fr` gap 12.
- **a11y.** `role="note"` (не `alert`: ничего не происходит динамически). Текст — обычный
  контраст `--l-text`.

**SourcePill** — фирменная «честная плашка» (03a §8.3) по образцу DS sync-status.

- **Разметка.** `<span class="l-pill"><svg …/>Dati: pikcrvt.edupage.org</span>` — не
  интерактивна (`span`, вне tab order, как DS-chip без действия).
- **Вид.** 30 px pill, `--l-surface`, `--l-ring-hairline`, padding 0 12, иконка 14 muted,
  caption 13 `--l-text-muted`, жирная часть — `--l-text`.
- **Варианты.** `illustration` (`image`, «Ilustrācija · piemērs»), `source` (`database`,
  «Dati: pikcrvt.edupage.org»), `school` (`quote`, «Teksts no skolas»), `unofficial` (`info`,
  «Neoficiāls projekts» — у CTA).
- **360.** Одна строка; при переполнении — перенос на вторую строку, высота auto (min 30).
- **Секции.** `#top`, `#now`, `#changes`, `#install`, FinalCta.

### 3.14 FAQ

- **Назначение.** Остаточные возражения (02a §1.8), 7–9 вопросов, ответ ≤ 3 строк.
- **Разметка.**

```html
<div class="l-faq">
  <details class="l-faq__item" id="faq-official">
    <summary class="l-faq__q"><span>Vai tā ir oficiāla skolas lietotne?</span><svg …chevron-down/></summary>
    <div class="l-faq__a"><p>…</p><p><a class="l-btn l-btn--link" href="#install-android">…</a></p></div>
  </details>
  …
</div>
```

  `id` — латиницей, одинаковые во всех языках: `faq-official`, `faq-play`, `faq-unknown-source`,
  `faq-updates`, `faq-offline`, `faq-privacy`, `faq-ios-widget`, `faq-wrong`, `faq-grades`.
- **Вид.** Каждый вопрос — отдельная карточка `--l-surface`, `--l-radius-card`,
  `--l-shadow-card`, gap 12 (DS-стек). `summary` — min-height 56, padding 16 20, body-lg 600
  `--l-text-strong`, `list-style: none` + скрытый `::-webkit-details-marker`, шеврон 20 справа.
  Ответ — body `--l-text`, padding 0 20 20.
- **Состояния.** closed / open (шеврон `rotate(180deg)`, `--l-dur-ui`) / hover (hover:hover —
  фон summary `--l-btn-tint`) / focus-visible (кольцо на summary, radius карточки) / active
  (без scale: это не кнопка-пилюля) / reduced-motion (шеврон без transition) / no-JS (нативно
  работает, клавиатура Enter/Space).
- **JS (`faq.ts`).** При загрузке и `hashchange`: если хеш = `#faq-*`, открыть этот
  `details` и прокрутить к нему. `toggle` → событие `FAQ Open` (`q` = id без префикса).
  Атрибут `name` (эксклюзивный аккордеон) не используем — можно открыть несколько.
- **a11y.** Семантика `details/summary` нативная; внутри summary нет других интерактивных
  элементов; заголовки вопросов не делаем `h3` внутри summary (ломает роль кнопки в части AT).
- **360.** Закрытый вопрос 56–80 px (2 строки LV/RU), 9 вопросов ≈ 1.3 экрана.
- **Секции.** `#faq`.

### 3.15 Footer

- **Назначение.** Проверка и доверие: дисклеймеры, приватность, код, языки, выход в приложение.
- **Разметка.** `<footer class="l-footer">` → `<section id="privacy" aria-labelledby="privacy-h">`
  с `h2` «Privātums» → текст `01c` дисклеймер 4 + ссылка на README Privacy + OptOut; `<p>`
  дисклеймеры 1 и 2 полностью на языке страницы; `<nav aria-label="Saites">` (GitHub,
  Releases, MIT — `l-btn--link`); `<nav aria-label="Valoda">` с полными названиями
  («Latviešu», «Русский», «English», «Українська», каждое с `lang`/`hreflang`,
  `aria-current` у текущего); последняя ссылка «Atvērt Stundio».
- **OptOut.** `<button class="l-btn l-btn--secondary l-btn--md" type="button"
  aria-pressed="false" data-optout hidden>Neuzskaitīt manus apmeklējumus</button>` — `hidden`
  снимает JS; состояние в `localStorage` (`l-noanalytics`), `aria-pressed="true"` + подпись
  «Apmeklējumi netiek uzskaitīti». Без JS кнопки нет — и аналитики тоже нет (Plausible — JS).
- **Вид.** Полоса `--l-sunken` с radius `--l-radius-shot` сверху (`36px 36px 0 0`), padding
  40 20 + `env(safe-area-inset-bottom)` + `--l-sticky-reserve` не нужен (sticky скрыт над
  футером). Текст caption/body muted; ссылки — `--l-link`, область 44 px.
- **Состояния.** У ссылок и кнопки — по Button. no-JS — без opt-out. reduced-motion — без отличий.
- **Секции.** `footer` (S6-портфолио обслуживается здесь, 02a).

### 3.16 StickyCta

- **Назначение.** Не дать убеждённому листать назад: прыжок в `#install` с нужной вкладкой
  (02a §2.4). **Не** скачивает APK напрямую (дисклеймер 3 должен идти до кнопки загрузки).
- **Разметка.** В конце `main`, до `footer`:
  `<div class="l-sticky" data-sticky hidden><a class="l-btn l-btn--primary l-btn--lg l-btn--block"
  href="#install-android" data-cta="install_jump" data-place="sticky">…Instalēt · Android</a></div>`.
  Набор подписей/href по `data-platform` (как DeviceCta, три ссылки, видна одна).
- **Логика (JS, `sticky-cta.ts`).** Только `js` + `max-width: 959px`. Показ, когда hero-CTA
  вне вьюпорта **и** не видны `#install`, FinalCta, `footer` (один IntersectionObserver на
  четыре цели). Скрытие: `inert` + `aria-hidden="true"` + класс; после окончания перехода —
  `visibility: hidden`. Отключить по признаку встроенного браузера, если 3.5 покажет конфликт с
  панелью инструментов.
- **Вид.** `position: fixed; inset-inline: 16px; bottom: calc(16px + env(safe-area-inset-bottom))`,
  сама кнопка `lg` 54 px — высота плашки ≤ 56 (02a) и это DS-пилюля (03a). Тень
  `--l-shadow-sticky`. Единственный fixed-элемент (DS One Fixed Thing — на лендинге им
  становится плашка, шапка не фиксирована).
- **Резерв места.** `.js` + `< 960`: `html { scroll-padding-bottom: var(--l-sticky-reserve) }`
  (фокус и якоря не уходят под плашку, WCAG 2.4.11), у `main` — `padding-bottom` на ту же
  величину (резерв постоянный → CLS 0).
- **Состояния.** hidden / shown (из `translateY(calc(100% + 16px))`, `opacity 0` → 0/1,
  `--l-dur-reveal`, `--l-ease`) / focus / active (scale) / reduced-motion (появление без
  движения) / no-JS (нет вовсе, `hidden` в разметке) / desktop (нет).
- **360.** 328 × 54, отступы 16.
- **Секции.** Глобально, между `#now` и `#install`, и снова между `#teachers` и FinalCta.

### 3.17 TeachersBlock

- **Назначение.** Отдельный вход для учителей (02a §1.6): «это и для меня» + ответ на
  «официально? моё имя куда-то уходит?».
- **Разметка.** QuestionSection `--panel`, `id="teachers"`; внутри `<ul class="l-features">`
  с 4–5 пунктами (иконка 20 + строка body): `user-round` (выбери своё имя, без логина),
  `building-2` (группа, кабинет, корпус), `repeat` (замены — aizvietošanas stundas — отдельно),
  `users` (баннер отсутствующих коллег), `bell` (уведомления о заменах). Затем строка-оговорка
  (`01c#11`: выбор имени — не авторизация; неофициально; тексты школы дословно), строка
  «Instalēšana tā pati; pirmajā palaišanā izvēlies „Skolotājs“», ссылка «Kā instalēt» →
  `#install`. Отдельной кнопки нет (`01a` S3).
- **Вид.** Панель `--l-sunken`, `--l-radius-shot`, padding 24 (на 360 — 20), рейл заголовка
  `--l-rail`. Иконки `--l-text-strong`, без цветных подложек (Index Rule).
- **Состояния.** Статичный; ссылки — по Button.
- **Терминология.** RU «преподаватель», UA «викладач» (`01c` §4.2).
- **Секции.** `#teachers`.

### 3.18 Вспомогательные блоки

| Компонент | Назначение и разметка | Вид | Секции |
| --- | --- | --- | --- |
| **FactList** | `<ul class="l-facts">`, пункт = иконка 20 `aria-hidden` + `<p>` с `<strong>`-зачином | grid `20px 1fr` gap 12, пункты через 12 | `#now`, `#offline`, `#install` |
| **FactPair** | Две карточки рядом (≥ 600) / друг под другом: «Bez interneta» (`wifi-off`), «Bez konta» (`user-round-x`), каждая `h3` + 2 строки + link → `#privacy` | `--l-surface`, radius-card, padding 20 | `#offline` |
| **WidgetList** | Типографский список виджетов (02a fallback): `<dl>`: `<dt>` название + размер `l-time` «2×1» / «4×2»; `<dd>` одна фраза; под списком Callout `ios` | карточка, разделение 12 px (без линий) | `#now` |
| **FeatureList** | `<ul class="l-features">` для `#more`: `share-2` неделя картинкой, `split` подгруппы, `languages` 4 языка (+ «тексты школы на LV»), `sun-moon` тема и цвета, `star` избранные группы | как FactList, компактнее (gap 8) | `#more`, `#teachers` |
| **QrCard** | `<figure>`: `<img src="/qr-<lang>.svg" width="160" height="160" loading="lazy" alt="QR kods: <адрес лендинга>">` + адрес текстом. На телефоне `display: none` (лениво не грузится) | белая карточка в обеих темах (QR читается только тёмным на светлом), padding 16, radius-card | `#top` desktop, `#install-desktop` |
| **FinalCta** | Синее поле: `<section class="l-final" aria-labelledby="final-h">` → `h2` + короткий дисклеймер 3 (Callout в инверсии: текст `--l-on-field`) **над** кнопкой + DeviceCta с `onField`-кнопками + SourcePill «Neoficiāls projekts» (на поле — `--l-on-field`, фон прозрачный, кольцо `--border-on-brand`) | `--l-field`, radius `--l-radius-shot`, margin-inline 8 (без квадратных углов у края экрана), padding 32 20; фокус белый | после `#faq` (см. Q3) |
| **TextLink в тексте** | `<a>` внутри абзаца: underline, offset 3 px; область касания расширяется `padding-block` без сдвига строки (`margin-block` отрицательный) | `--l-link` | везде |

---

## 4. Карта «секция → компоненты»

| Секция (02a) | Компоненты | JS-улучшения | Ассеты |
| --- | --- | --- | --- |
| `header` | SkipLink, Header, LangSwitch | перенос хеша при смене языка, `Lang Switch` | mark (инлайн) |
| `#top` | Hero, Eyebrow, NowNextScene (+ `--compact` при низком вьюпорте), SourcePill `illustration`, DeviceCta (+ панель «Kas tālāk», строка встроенного браузера, строка доверия «200+»), QrCard (≥ 960) | платформа, переключатель платформы, панель после APK, копирование адреса | — |
| `#now` | QuestionSection, FactList, NowNextScene (desktop, опц.), WidgetList, Callout `ios`, ScreenshotFrame (week-view), TextLink → `#install` | — | `week-view.*` |
| `#changes` | QuestionSection, ChangesScene, SourcePill `illustration` + `school`, FactList (уведомления: Android локально; iPhone — после экрана Домой) | сюжет отмены | — |
| `#offline` | QuestionSection, FactPair, TextLink → `#privacy` | — | — |
| `#install` | QuestionSection, InstallTabs → Callout `apk`, Button, StepList, FactList, Callout `quiet`, Callout `ios`, QrCard | вкладки, хеш ↔ вкладка | `qr-<lang>.svg` |
| `#teachers` | QuestionSection `--panel` (TeachersBlock), FeatureList, TextLink → `#install` | — | — |
| `#more` | QuestionSection, FeatureList | — | — |
| `#faq` | QuestionSection, FAQ | открытие по хешу, `FAQ Open` | — |
| FinalCta (Q3) | FinalCta, DeviceCta (`onField`), Callout `apk` (короткий), SourcePill `unofficial` | платформа | — |
| `footer` | Footer, Callout `legal`, OptOut, LangSwitch (полные названия) | opt-out | — |
| глобально | StickyCta | показ/скрытие | — |

---

## 5. Файлы для реализации и порядок сборки (3.3)

### 5.1 Структура `landing/`

```
landing/
  vite.config.ts              root: landing/src, outDir: landing/dist, плагины ниже
  tsconfig.json               отдельный проект; reference из корневого tsconfig.json
  build/
    pages.ts                  рендер 4 языков → HTML-входы; dev-перерендер + full reload
    ds-dark.ts                virtual:ds-dark.css из src/ds/tokens/dark.css (падает без блока)
    inline-css.ts             CSS → <style> в каждой странице
    fonts.ts                  subset-font по языку → woff2 + @font-face + preload
    meta.ts                   theme-color из токенов, hreflang, canonical, sitemap, robots, QR-SVG
  src/
    render.ts                 renderPage(lang): каркас страницы, порядок секций
    html.ts                   html`` с экранированием, attrs()
    i18n/
      index.ts                Lang = "lv" | "ru" | "en" | "ua", типы ключей по lv.ts, htmlLang (ua → uk)
      lv.ts ru.ts en.ts ua.ts тексты из 02b-copy.md
    content/
      scene.ts                сценарии NowNext/Changes, allowlist скриншотов, адреса (APP_URL, DOWNLOAD_URL, LANDING_URL)
    components/
      skip-link.ts header.ts lang-switch.ts button.ts icon.ts device-cta.ts hero.ts
      question-section.ts now-next-scene.ts changes-scene.ts screenshot-frame.ts
      install-tabs.ts step-list.ts callout.ts source-pill.ts fact-list.ts widget-list.ts
      feature-list.ts qr-card.ts faq.ts teachers-block.ts final-cta.ts sticky-cta.ts footer.ts
    icons/                    Lucide SVG (ISC): download smartphone monitor arrow-down map-pin
                              building-2 wifi-off user-round user-round-x shield-check info image
                              image-off database quote share share-2 split languages sun-moon
                              star bell users repeat chevron-down copy
    styles/
      index.css               порядок импортов: DS-токены → virtual dark → tokens → base → layout → components
      tokens.css              все --l-* (§2) + тёмные переопределения
      base.css                reset, body, типографика, фокус, sr-only, бэкстоп reduced-motion
      layout.css              колонка, контейнер, ритм секций, брейкпоинты 600/960
      components/*.css        по файлу на компонент из §3
    scripts/
      head.ts                 инлайн в <head>: data-platform, класс js, автоязык (только корень, первый визит)
      main.ts                 точка входа модулей
      device-cta.ts install-tabs.ts sticky-cta.ts faq.ts changes-anim.ts
      lang-switch.ts copy-url.ts opt-out.ts analytics.ts
  public/
    _headers                  кэш: /assets/* immutable; HTML no-cache; nosniff, Referrer-Policy, Permissions-Policy
    404.html                  простой, LV + ссылки на языки (или генерируется pages.ts)
    favicon.ico favicon.png   копии из public/ (не ссылки на чужой origin)
    img/week-view.{avif,webp,png}
  dist/                       (gitignore)
```

Изменения вне `landing/` (делает 3.3/архитектор, не трогая `src/`, `android/`, `functions/`):
`package.json` — скрипты `landing:dev`, `landing:build`, `landing:preview` и dev-зависимость
`subset-font`; `tsconfig.json` — reference на `landing/tsconfig.json`; `eslint.config.js` —
`ignores` += `landing/dist`; `.prettierignore` — `landing/dist`; `ci.yml` — job
`deploy-landing` (§1.3). Корневой `vite.config.ts`, `public/` и `sw.js` не меняются.

### 5.2 Порядок сборки

1. **Каркас.** Конфиг, `pages.ts` с пустыми страницами на 4 языка, `ds-dark.ts`,
   `inline-css.ts`, скрипты в `package.json`, ignore-правки. Проверка: `npm run lint`,
   `format:check`, `typecheck`, `build` приложения — зелёные, `dist/` приложения байт-в-байт
   прежний (тот же `BUILD_ID` в `dist/sw.js`).
2. **Токены и база.** `tokens.css`, `base.css`, `layout.css`; служебная страница-образец
   (только dev) со всеми цветами в обеих темах — сверить контраст §2.4.
3. **Примитивы.** `html.ts`, Icon, Button, SourcePill, Callout, StepList, FactList.
4. **Рамка страницы.** SkipLink, Header + LangSwitch, Footer, `hreflang`/canonical, `lang`.
5. **Hero без JS.** Hero, NowNextScene (CSS-анимация), DeviceCta в нейтральном состоянии.
   **Замер** первого экрана на 360 × 600 для LV и RU, системным шрифтом и Manrope.
6. **Секции ценности.** QuestionSection, `#now` (WidgetList, ScreenshotFrame), `#changes`
   (ChangesScene в финальном состоянии), `#offline`.
7. **Установка и хвост.** InstallTabs (no-JS: три панели), `#teachers`, `#more`, FAQ, FinalCta.
8. **JS-улучшения.** `head.ts`, затем `device-cta`, `install-tabs`, `faq`, `changes-anim`,
   `sticky-cta`, `lang-switch`, `copy-url`. После каждого — проверка с выключенным JS.
9. **Шрифты и картинки.** `fonts.ts`, preload, метрики фолбэка; конвертация week-view.
10. **Аналитика и мета.** `analytics.ts` + `opt-out.ts` (флаг проверяется до любой отправки),
    `meta.ts`, `_headers`, `404.html`, sitemap.
11. **Самопроверка по §6**, затем передача в 3.4.

---

## 6. Чеклист приёмки

**Ширина 360 и раскладка**
- [ ] Нет горизонтального скролла на 320, 360, 390, 768, 1024, 1440; системный шрифт 200 % —
      тоже без горизонтального скролла.
- [ ] На 360 × 600 (LV и RU) CTA и микротекст целиком в первых 520 px, до и после загрузки шрифта.
- [ ] При `max-height: 619px` сцена компактная, но не исчезает и не уходит ниже CTA.
- [ ] Все цели ≥ 44 × 44, между соседними ≥ 8 px; CTA 54 px.
- [ ] Ни одного квадратного угла, радиуса < 8, рамки у карточки; один fixed-элемент (sticky).

**Тёмная тема**
- [ ] Тема по `prefers-color-scheme`, значения — из `dark.css` через `ds-dark.ts` (нет ручных копий).
- [ ] `--l-now` = blue-300, бейдж отмены — ink-900 на `#ff6b5e`, фокус ink-300 (§2.4).
- [ ] `theme-color` для обеих тем совпадает с `--bg-app`; без навигационных теней в тёмной.

**Доступность (WCAG 2.2 AA)**
- [ ] Контраст всех пар §2.4; muted-текст не на sunken ниже 4.5.
- [ ] Один `h1`; секции — `section[aria-labelledby]` с `h2` «вопрос + ответ»; `h3` в панелях установки.
- [ ] `lang` на `<html>` (`lv`/`ru`/`en`/`uk`) и на каждом пункте переключателя; имена языков на своих языках.
- [ ] Фокус виден везде (на синем — белый), не перекрыт sticky (`scroll-padding-bottom`), skip-link работает.
- [ ] Сцены — `role="img"` с полным `aria-label` на языке страницы; видимая плашка «Ilustrācija · piemērs».
- [ ] Вкладки по ARIA APG (стрелки, Home/End, roving tabindex); FAQ на `details` с клавиатуры.
- [ ] Автотест axe (0 нарушений) + проход скринридером (TalkBack и VoiceOver) по hero и установке.

**Производительность (Lighthouse mobile, Slow 4G)**
- [ ] LCP ≤ 2.0 s (LCP = H1), CLS < 0.05, INP < 200 ms.
- [ ] HTML + инлайн-CSS ≤ 14 KB gzip; шрифты первого экрана ≤ 70 KB (LV) / ≤ 95 KB (RU/UA);
      JS ≤ 10 KB gzip; первый экран ≤ 150 KB; страница целиком ≤ 500 KB.
- [ ] Нет запросов к сторонним доменам до `load`; Plausible — `defer`, после load, и только без opt-out.
- [ ] Анимируются только `transform`/`opacity`; нет `will-change` в покое; нет циклических анимаций.
- [ ] Изображения: AVIF/WebP/PNG, `width`/`height`, `lazy` ниже сгиба; в hero изображений нет.

**Reduced motion**
- [ ] При `reduce`: полоса прогресса сразу заполнена, отмена сразу отменена, sticky и панель без движения.
- [ ] Никакой контент не скрыт до старта анимации (нет `opacity: 0` в статичном CSS).

**Без JS**
- [ ] Нейтральный CTA (две равные кнопки + «Atvērt pārlūkā»), все три панели установки
      раскрыты, FAQ работает, языки — обычные ссылки, нет sticky, нет opt-out-кнопки.
- [ ] Строка «Soļi strādā Safari» и адрес для встроенных браузеров видны.
- [ ] Ошибка в `main.ts` (симулировать `throw`) не ломает страницу.

**4 языка**
- [ ] `/`, `/ru/`, `/en/`, `/ua/` собраны из одного шаблона; ключи словарей типизированы по LV;
      `hreflang` + `x-default` → LV; canonical на каждой.
- [ ] Автоопределение только на корне и только при первом визите, `location.replace`, выбор
      пользователя побеждает; якорь сохраняется при смене языка.
- [ ] Тест-строка 03a §5 рендерится без фолбэка во всех языках; капс с макронами не обрезан.
- [ ] H1 не переносится по буквам на 360 ни в одном языке.

**Запреты `01c` и `03a`**
- [ ] Нет Google Play / App Store (бейджей, «скоро»), отзывов, звёзд, рейтингов, логотипов
      RVT/EduPage, прессы; единственная цифра — «200+ человек, включая учителей», статичным текстом.
- [ ] Нет «нет сервера», «без трекинга», «ничего не уходит с устройства», «в реальном времени»,
      «100 % офлайн», «мгновенные уведомления на Android», «iPhone-приложение», «виджеты на iPhone».
- [ ] Дисклеймер 3 стоит **до** каждой кнопки APK (кроме hero-микротекста по 02a); sticky не скачивает APK.
- [ ] Дисклеймеры 1, 2, 4 полностью в футере на каждом языке; «Неофициальный проект» у CTA.
- [ ] Нет имён преподавателей и учеников; скриншоты — только из allowlist (сейчас week-view).
- [ ] Каждая HTML-сцена помечена видимой плашкой; никаких перерисованных интерфейсов Android/iOS.
- [ ] Нет эмодзи и юникод-символов как иконок, нет флагов; иконки — Lucide.
- [ ] Нет синих кнопок; электрик ≤ 1–2 элементов на экран (кольцо «сейчас», ссылки), одно синее поле.
- [ ] Ссылки «Открыть» ведут на `https://stundio.pages.dev/`, загрузка — на `…/download`; ничего не ведёт на лендинг.
- [ ] `dist/` приложения и `sw.js` не изменились; `src/`, `android/`, `functions/` не тронуты.

---

## 7. Решения и открытые вопросы

**Принятые решения (вписать в журнал PLAN.md)**
- Сборка: отдельный `landing/vite.config.ts`, render-функции на TS, без рантайм-фреймворка.
- Деплой: отдельный проект Cloudflare Pages `stundio-landing`; корень `stundio.pages.dev`
  остаётся приложению. Путь `/landing/` — только с правкой `sw.js` (F1).
- Тёмная тема — `dark.css` через плагин, под `prefers-color-scheme`.
- Шрифты — сабсеттинг по языку страницы.
- Прогресс в hero анимируется чистым CSS (без JS); отмена в `#changes` — IntersectionObserver.
- В иллюстрации отмены метаданные не гасятся (F5) — отступление от DS ради AA.

**Вопросы автору / архитектору**

| # | Вопрос | По умолчанию |
| --- | --- | --- |
| Q1 | Подтвердить отдельный проект Pages и имя `stundio-landing` (или свой домен) | Отдельный проект |
| Q2 | Кольцо «сейчас» электрическое (03a) или ink, как в shipped-приложении (F3)? | Электрик (03a); переключение — `--l-now: var(--brand)` |
| Q3 | FinalCta (синее поле после FAQ) есть в 03a, но не в списке секций 02a. Оставить? | Оставить; sticky скрывается и над ним |
| Q4 | Сообщить автору о багах приложения: белый текст на danger в тёмной (F4, 2.79:1); DESIGN.md описывает электрическое кольцо, а код — ink (F3) | Только сообщить, не чинить |
| Q5 | Адрес лендинга для QR и строки встроенного браузера | `stundio-landing.pages.dev` до решения Q1 |
