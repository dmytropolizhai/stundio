# 03c — Десктопная раскладка лендинга (≥ 960 px)

Подзадача 3.7 из `docs/landing/PLAN.md`. Дата: 2026-10-06. Арт-директор: Opus 5.5.

Вход: `03a-direction.md`, `03b-components.md`, `02a-ia.md`, `02-sections.md`, `02b-copy.md`,
`01c-claims-and-voice.md`, `DESIGN.md`, `src/ds/tokens/*.css`, весь `landing/src/styles/**` и
`landing/src/components/*.ts`, `landing/src/content/scene.ts`, словари `landing/src/i18n/*.ts`.
Процесс: impeccable (режим **Persuade**, мир Studio DS сохраняется, это refinement раскладки, а не
редизайн) + ui-ux-pro-max (паттерн «Feature-Rich Showcase»: hero → сетка фич → CTA; UX-правила
«Sticky Navigation» и «Focus Not Obscured»). Поиск «hero centered product showcase» в базе
ui-ux-pro-max совпадений не дал, поэтому композицию hero я вывожу из брифа автора и DS, а не из базы.

**Контракт.** Всё ниже включается только с `@media (min-width: 960px)`. Раскладка < 960 px
(телефон, планшет-портрет) остаётся как есть и считается контрактом: ни одно правило этого документа
не меняет вид страницы уже 960 px. Новая разметка, которая не нужна телефону, скрыта ниже 960 через
`display: none` (как `[data-desktop-only]` сейчас), поэтому её нет ни в отрисовке, ни в дереве
доступности.

**Проверки в браузере не было.** Все утверждения о раскладке выведены из CSS и разметки, а не из
скриншотов. Что нужно посмотреть глазами на 1280, 1440 и 1920, перечислено в §8.4.

---

## 0. Что берём у Notion, а что нет

Берём только **раскладку и ритм** главной notion.com на десктопе:

| Приём Notion | Как это выглядит у нас |
| --- | --- |
| Очень крупный центрированный H1 в 2 строки | H1 `hero.title` по центру, 2 строки, до 80 px (§4.2) |
| Инлайновая «пилюля» внутри фразы | Слово «tagad / сейчас / now / зараз» в H1 становится чипом с точкой, это тот же «сейчас», что на сцене ниже (§4.3) |
| Короткий подзаголовок, две центрированные кнопки (заливка + тихая) | `hero.subtitle`; DeviceCta: чёрная pill «Atvērt pārlūkā» и тихая серая «Android (APK)» (§4.4) |
| Огромный макет продукта, выходящий из-под hero | «Сцена-стенд»: день из приложения, виджет и QR, честно подписанные как иллюстрация (§4.5) |
| Спокойная полоса логотипов | Полоса фактов «что внутри» без логотипов и цифр (§6) |
| Прозрачная шапка: логотип слева, навигация по центру, действия справа | То же, плюс переключатель языка; на скролле появляется hairline (§3) |
| Шахматка feature-блоков, сетки карточек с hairline, узкий FAQ, финальный CTA | Секции §5 |
| Много воздуха, единый вертикальный ритм | Полосы 128 px, 12 колонок, токены `--l-*` (§2) |

**Не берём:** шрифт, палитру, иллюстрации-персонажи, тексты, логотипы чужих компаний, цифры и
отзывы, эмодзи, анимированные демо. Бренд остаётся Studio DS: Manrope, бумага `--l-bg`, белые
карточки, чёрные pill-кнопки, один электрик.

**Конфликты с DS и как они решены** (подробности в соответствующих разделах):

| Пожелание | Правило DS | Решение |
| --- | --- | --- |
| Hairline-рамки у карточек | «Borders: none. Ever»; hairline только как inset-кольцо | Hairline = `--l-ring-hairline` (inset `box-shadow`), только для белых карточек на белой полосе. На бумаге остаётся `--l-shadow-card` |
| Blur шапки при скролле | The Two Blurs Rule: размытие над белым запрещено | Blur **не** делаем. Шапка на скролле получает непрозрачный фон `--l-bg` и hairline снизу |
| Шапка, которая остаётся видимой при скролле | «Don't make the top bar sticky; the bottom nav is the only fixed element» | На ≥ 960 нижней плашки нет (`sticky.css`), место «одного фиксированного элемента» свободно. Предлагаю sticky-шапку **только на десктопе**, это отступление от DS, его должен подтвердить автор (§9, вопрос 1). Запасной вариант без вреда для раскладки: `position: static` |
| Светло-синяя вторичная кнопка | Neutral Button: кнопки не бывают синими | Тихая кнопка тонирована нейтральным `--border-hairline` (ink-200 / #262a35 в тёмной) |
| FAQ в две колонки (`02a` §6) | — | Узкая центральная колонка, как у Notion и как просит автор. Отступление от `02a` §6 |

---

## 1. Диагноз текущего десктопа (по исходникам)

Что даёт ощущение «набросано», по файлам:

1. **Нет главного визуального события.** Hero на ≥ 960 — сетка `1fr 380px` с четырьмя областями
   `text / cta / scene / qr` (`hero.css:158–198`). Самый крупный визуал страницы, сцена «Tagad»,
   ограничен 380 px. На 1440 это около 26 % ширины, и рядом ещё QR-карточка того же веса. Взгляду
   не за что зацепиться: четыре равноценных блока вместо одного акцента.
2. **H1 зажат в узкую колонку.** `--l-size-hero: clamp(64px, 6.25vw, 80px)` (`tokens.css:97`) в
   колонке `1fr` ≈ 1120 − 380 − 64 = 676 px. При 80 px Manrope 800 (≈ 0.62 em на знак) это около
   13 знаков в строке: «Stundu saraksts: tagad un tālāk» ложится в 3–4 рваные строки.
   Крупный шрифт есть, но масштаба он не даёт.
3. **Кнопки остались мобильными.** `.l-btn--block` (`width: 100%`) плюс
   `.l-hero__cta { max-width: 420px }` и `grid-template-columns: 1fr` у нейтрального набора
   (`hero.css:184, 197`) дают кнопки шириной 420 px, поставленные друг на друга. На экране
   компьютера это читается как телефон, растянутый на широкий экран.
4. **Плавающие подписи в секциях.** В `.l-q` на ≥ 960 (`sections.css:297–312`) proof стоит в
   `grid-row: 1 / span 4` на неявных `auto`-рядах. По алгоритму grid лишняя высота высокого
   элемента делится между всеми рядами, которые он перекрывает, поэтому слева заголовок, lead и
   ссылка-выход разъезжаются по высоте proof. Ссылка «Kā uzstādīt» в `#now` и `#teachers`
   оказывается посреди пустоты, а не под текстом.
5. **Один шаблон на всё.** Каждая секция, кроме `#install`, использует одну сетку 5/7 «заголовок
   слева, доказательство справа» с одним отступом 96 px (`--l-gap-section`). Нет чередования
   «шахматка / сетка / центр», нет смены фона (кроме `#teachers` в sunken-панели и синего финала).
   Восемь одинаково весомых блоков подряд воспринимаются как черновик.
6. **Визуалы маленькие и прижаты влево в широкой колонке.** `.l-shot` с шириной 241 px и
   `justify-items: start` (`sections.css:334`) стоит в колонке 7fr (~640 px), справа от него
   ~400 px пустоты. В `#more` и `#offline` вообще нет визуала: в колонке 7fr только список.
7. **Поля телефона на десктопе.** `--l-gutter` = `--gutter-screen` 20 px на любой ширине, а
   `--l-container` один (1120 px) от 960 до 2560. Нет шагов 1200 и 1440, на 1920 по бокам
   400 px пустоты при узкой и плотной середине.
8. **Мелкие отступы у hero.** `padding-block: var(--space-10)` (40 px) у hero плюс 16 px сверху у
   `.l-main`. Шапка 56 px без навигации, первый экран начинается сразу у верхнего края.
9. **Колонки установки не совпадают.** `#install` — три равные колонки (`install.css:67–70`), но
   до кнопки в Android идут абзац и callout, в iPhone только абзац, в «Компьютере» только lead.
   Три главные кнопки страницы стоят на разной высоте, и у колонок рваные низы.
10. **Подвал на всю ширину без колонок.** Абзацы `footer.disclaimer`, `privacy.body` и другие
    caption 13 px идут на всю ширину 1120 px (`footer.css:49–52`), это около 170 знаков в строке.
    Ограничения меры у подвала нет.
11. **Финал прижат влево.** `.l-final` на ≥ 960: заголовок слева, `.l-cta { max-width: 420px }`
    с блочными кнопками (`final.css:54–62`). Это последний экран, и он не симметричен ни
    hero, ни странице.
12. **QR повторяется.** QrCard стоит в hero и в `#install-desktop` с одинаковым весом.
13. **Мера текста не работает.** `--l-measure: 60ch` для lead, но колонка 5fr (~440 px) уже
    этой меры, так что ограничение ни на что не влияет. При этом в подвале и в `#install` меры нет
    вообще.

Итог: материалы хорошие (DS-токены, честные сцены, верные тексты), не хватает **одной оси
композиции**: центра, масштаба и ритма полос.

---

## 2. Сетка и ритм

### 2.1. Брейкпоинты

| Диапазон | Имя | Контейнер `--l-container` | Поле `--l-gutter` | Колонки / зазор `--l-col-gap` | Полоса `--l-gap-section` |
| --- | --- | --- | --- | --- | --- |
| < 960 | phone/tablet | без изменений (`--l-col` 420) | 20 | 1 колонка (контракт) | 64 |
| 960–1199 | desk-s | `100vw − 2 × 32` (≤ 1136) | 32 (`--space-8`) | 12 / 24 (`--space-6`) | 96 (`--space-16 + --space-8`) |
| 1200–1439 | desk-m | 1120 | 40 (`--space-10`) | 12 / 32 (`--space-8`) | 128 (`2 × --space-16`) |
| ≥ 1440 | desk-l | 1200 | 40 | 12 / 32 | 144 (`2 × --space-16 + --space-4`) |

Выше 1440 контейнер не растёт: на 1920 по бокам остаётся по 360 px воздуха. Фоны полос (§2.4)
при этом идут на всю ширину, поэтому пустота читается как поля страницы, а не как дыры.

### 2.2. Новые и изменённые токены `--l-*` (`landing/src/styles/tokens.css`)

```css
@media (min-width: 960px) {
  :root {
    --l-gutter: var(--space-8);                    /* 32 */
    --l-container: calc(100vw - 2 * var(--space-8));
    --l-col-gap: var(--space-6);                   /* 24 */
    --l-header-h: 64px;
    --l-size-hero: clamp(64px, 3.2vw + 34px, 80px); /* 960→65, 1200→72, 1440→80 */
    --l-lh-hero: 1;                                 /* у пилюли должно быть место (§4.3) */
    --l-size-h2: var(--size-display-1);             /* 40 */
    --l-size-lead: 19px;
    --l-size-body: 16px;
    --l-gap-section: calc(var(--space-16) + var(--space-8)); /* 96 */
    --l-gap-head: var(--space-12);    /* блок заголовка → контент секции, 48 */
    --l-gap-text: var(--space-4);     /* h2 → lead, 16 */
    --l-measure: 60ch;                /* абзацы */
    --l-measure-center: 38rem;        /* центрированный lead, ≈ 608 px */
    --l-measure-head: 18ch;           /* h2 в шахматке */
    --l-stage-overlap: 160px;         /* насколько сцена-стенд заходит на следующую полосу */
    --l-radius-stage: var(--radius-2xl); /* 36 */
    --l-btn-quiet: var(--border-hairline);
    --l-btn-quiet-hover: var(--border-strong);
    --l-chip-bg: var(--blue-050);
    --l-chip-fg: var(--blue-500);
    --l-chip-dot: var(--blue-500);
  }
}
@media (min-width: 1200px) {
  :root {
    --l-gutter: var(--space-10);      /* 40 */
    --l-container: 1120px;
    --l-col-gap: var(--space-8);      /* 32 */
    --l-size-h2: 48px;                /* landing-шаг, см. примечание */
    --l-size-lead: 20px;
    --l-gap-section: calc(2 * var(--space-16)); /* 128 */
  }
}
@media (min-width: 1440px) {
  :root {
    --l-container: 1200px;
    --l-gap-section: calc(2 * var(--space-16) + var(--space-4)); /* 144 */
  }
}
@media (min-width: 960px) and (prefers-color-scheme: dark) {
  :root {
    --l-chip-bg: color-mix(in oklab, var(--blue-300) 18%, var(--l-surface));
    --l-chip-fg: var(--blue-200);
    --l-chip-dot: var(--blue-300);
  }
}
```

Примечание: H2 48 px на ≥ 1200 — новое landing-усиление сверх таблицы `03a` §2 (там 40 px). Его
нужно внести в ту таблицу при реализации. Значения строятся из DS-шагов; сырой hex не появляется.

### 2.3. Каркас страницы: контент-сетка вместо узкого `.l-main`

Сейчас `.l-header`, `.l-main` и `.l-footer` — один центрированный блок шириной 1120 px, поэтому
фон на всю ширину невозможен. На ≥ 960:

```css
@media (min-width: 960px) {
  .l-main {
    max-width: none;
    padding: 0;
    gap: 0;                                 /* ритм задают полосы */
  }
  .l-band {                                 /* любая секция-полоса */
    padding-block: var(--l-gap-section);
    padding-inline: max(var(--l-gutter), calc((100% - var(--l-container)) / 2));
  }
  .l-band[data-tone="paper"] { background: var(--l-bg); }
  .l-band[data-tone="white"] { background: var(--l-surface); }
}
```

Это тот же приём, которым уже растянут подвал (`footer.css:20, 51`), только для всех секций.
`.l-band` и `data-tone` добавляются в разметку (`questionSection`, hero, полоса фактов). Ниже 960
у `.l-band` стилей нет, мобильная раскладка не меняется.

**12 колонок внутри полосы:** `.l-grid12 { display: grid; grid-template-columns: repeat(12,
minmax(0, 1fr)); column-gap: var(--l-col-gap); }`. Секции раскладываются по линиям 12-колоночной
сетки (таблица §5), без `fr`-пропорций «на глаз».

### 2.4. Вертикальный ритм (один для всей страницы)

| Шаг | Значение (desk-m) | Токен |
| --- | --- | --- |
| Полоса → полоса (внутренний отступ сверху и снизу) | 128 | `--l-gap-section` |
| Блок заголовка секции → контент | 48 | `--l-gap-head` |
| H2 → lead | 16 | `--l-gap-text` |
| Lead → факты/кнопка внутри текстовой колонки | 24 | `--l-gap-block` |
| Карточка ↔ карточка в сетке | 24 по обеим осям (на 960 — 24, ≥ 1200 — 32 по горизонтали) | `--l-col-gap` / `--space-6` |
| Внутренний отступ карточки | 32 | `--space-8` |
| Hero: шапка → H1 | 64 (desk-s 48, desk-l 80) | `--space-16` |

Правило: в одной полосе одна тема и один ритм. Блоков «между полосами» нет, за исключением
сцены-стенда, которая намеренно перекрывает границу (§4.5).

### 2.5. Меры текста

- Абзацы: ≤ `60ch` (`--l-measure`), в узкой колонке шахматки фактически 5 колонок (~440–480 px).
- Центрированный lead (hero, центр-секции): ≤ `38rem`.
- H2 в шахматке: ≤ `18ch`; центрированный H2: ≤ `22ch`; H1: ≤ `14em`, на практике ровно 2 строки
  (§4.2).
- Подвал и caption: ≤ `60ch` на колонку.

### 2.6. Порядок полос и тона

| # | Полоса | Тон | Раскладка |
| --- | --- | --- | --- |
| 1 | hero `#top` | paper | центр + стенд, перекрывающий низ |
| 2 | полоса фактов | white | центр, один ряд |
| 3 | `#now` | white | шахматка A: текст слева, визуал справа |
| 4 | `#changes` | paper | шахматка B: визуал слева, текст справа |
| 5 | `#offline` | white | центр-заголовок + 2 карточки |
| 6 | `#install` | paper | центр-заголовок + 3 карточки |
| 7 | `#teachers` | white | шахматка A внутри sunken-панели |
| 8 | `#more` | white | центр-заголовок + 4 карточки |
| 9 | `#faq` | paper | узкая центральная колонка |
| 10 | финальный CTA | paper | синий залив по центру |
| 11 | footer | sunken | 12 колонок: 4 / 4 / 4 |

Правило карточек: **на белой полосе** карточка белая с `--l-ring-hairline` и без тени (DS: inset-
кольцо для white-on-white). **На бумаге** карточка белая с `--l-shadow-card` (DS-норма). Так
hairline-сетки Notion получаются без единого `border`.

Тёмная тема: `--l-bg` #0b0c10 и `--l-surface` #16181f по-прежнему чередуются. Карточки на «белой»
полосе в тёмной теме того же цвета, что полоса, поэтому inset-кольцо `#262a35` для них обязательно,
и правило выше уже это покрывает.

---

## 3. Шапка

### 3.1. Композиция

```
| [mark] Stundio          Kas tagad  Izmaiņas  Uzstādīt  Skolotājiem  Jautājumi          [LV RU EN UA] [Atvērt Stundio] |
```

- Сетка: `grid-template-columns: 1fr auto 1fr`. Бренд `justify-self: start`, навигация по центру
  (центр настоящий, не зависит от ширины краёв), действия `justify-self: end`.
- Высота `--l-header-h` 64. Шапка на всю ширину (`max-width: none` + `padding-inline` как у
  `.l-band`), содержимое в контейнере.
- **Навигация** (новый `<nav class="l-nav" aria-label="…">`, пять обычных `<a href="#…">`):
  `#now`, `#changes`, `#install`, `#teachers`, `#faq`. Текст 15 px / 600, цвет `--l-text`, hover
  `--l-text-strong` + фон `--l-btn-tint` в pill (только `@media (hover: hover)`). Область нажатия
  44 px (`min-height: var(--l-tap)`, `padding-inline: var(--space-3)`). Без scrollspy и без
  подчёркиваний активного пункта: JS не нужен, DS не любит индикаторные линии.
- **Справа:** существующий `.l-lang` (коды в сегменте) и кнопка `primary md` «Atvērt Stundio»
  (ключ `footer.open`, `href = APP_URL`, `data-cta="open_web" data-place="header"`). Открыть
  веб-приложение честно на любой платформе, поэтому подпись не зависит от `data-platform`.
- **960–1199:** кнопку в шапке скрыть: в hero кнопка та же, а в ширину 896 px все пять пунктов и
  язык помещаются только без неё. Оценка по самым длинным подписям (UA «Встановлення»,
  «Викладачам»): навигация ≈ 490 px, бренд 130, язык 168, промежутки 64, всего ≈ 850 ≤ 896. На
  ≥ 1200 кнопка возвращается (≈ 1010 ≤ 1120).
- **Ниже 960:** `.l-nav` и кнопка `display: none`. Шапка остаётся 56 px, не sticky (контракт).

**Новые ключи словаря** (тексты предлагаю я; это chrome, а не claims, но вычитку RU/UA носителем
это не отменяет):

| Ключ | LV | RU | EN | UA |
| --- | --- | --- | --- | --- |
| `header.navLabel` | Sadaļas | Разделы | Sections | Розділи |
| `nav.now` | Kas tagad | Что сейчас | Now | Що зараз |
| `nav.changes` | Izmaiņas | Замены | Changes | Заміни |
| `nav.install` | Uzstādīt | Установка | Install | Встановлення |
| `nav.teachers` | Skolotājiem | Учителям | Teachers | Викладачам |
| `nav.faq` | = `faq.title` | = `faq.title` | = `faq.title` | = `faq.title` |

### 3.2. Поведение при скролле

- `position: sticky; top: 0; z-index: 4` — только на ≥ 960 и только если автор согласится
  (§0, §9-1).
- В покое фон прозрачный (сливается с бумагой hero), hairline нет.
- После ~64 px прокрутки: фон `--l-bg` (непрозрачный, **без blur**), снизу
  `box-shadow: 0 1px 0 var(--border-hairline)`. Делается на CSS без JS:

```css
@media (min-width: 960px) {
  .l-header { position: sticky; top: 0; z-index: 4; background: var(--l-bg); }
  @supports (animation-timeline: scroll()) {
    .l-header {
      animation: l-header-lift linear both;
      animation-timeline: scroll(root);
      animation-range: 0 64px;
    }
    @keyframes l-header-lift {
      from { background-color: transparent; box-shadow: 0 1px 0 transparent; }
      to   { background-color: var(--l-bg); box-shadow: 0 1px 0 var(--border-hairline); }
    }
  }
}
```

  Где scroll-timeline не поддерживается: шапка сразу непрозрачная `--l-bg` без hairline. Это
  корректно и выглядит спокойно. При `prefers-reduced-motion: reduce` бэкстоп в `base.css`
  отключает анимацию, и шапка остаётся в начальном состоянии: прозрачная и без линии, но на
  бумажных полосах читается, а на белых она поверх белого. Поэтому под `reduce` нужно явно
  поставить `animation: none; background: var(--l-bg); box-shadow: 0 1px 0 var(--border-hairline)`.
- Якоря не должны уходить под шапку (WCAG 2.4.11): `html { scroll-padding-top:
  calc(var(--l-header-h) + var(--space-4)); }` на ≥ 960, а у `.l-q`, `.l-faq__item` и панелей
  установки `scroll-margin-top` убрать или выровнять с этим значением.
- `scroll-behavior: smooth` для `html` только под `prefers-reduced-motion: no-preference`.
- **No-JS:** всё выше работает без JS, навигация состоит из обычных якорей.

---

## 4. Hero

### 4.1. Композиция (desk-m, 1440 × ~820 видимой высоты)

```
                         [шапка 64]
                              64
           Stundu saraksts:                          ← H1, 80 px, по центру
         [● tagad] un tālāk                          ← вторая строка, пилюля
                              24
   Stunda, kabinets un ēka uz ekrāna, arī bez interneta. Bez pieteikšanās.   ← lead 20 px, ≤ 38rem
                              32
          [ ▣ Atvērt pārlūkā ]   [ Android (APK) ]   ← primary lg + quiet lg
                              16
      Darbojas pārlūkā. Uz tālruni: noskenē QR kodu.                ← micro 13 px
  Tavas grupas saraksts no publiskā RVT saraksta (EduPage). Neoficiāli. · 200+ …   ← source + trust
                              64
 ┌──────────────────────────── сцена-стенд, 12 колонок ────────────────────────────┐
 │  [QR]           [ экран дня: 4 урока, «Tagad» в кольце ]     [ виджет 2×1 ]     │ ← верх стенда ≈ y 600
 │  Uz tālruni     Ilustrācija · piemērs                         Android logrīks    │
 └────────────────────────────── 160 px заходит на белую полосу ───────────────────┘
```

Порядок в DOM не меняется (H1 → lead → source → сцена → CTA → QR). На ≥ 960
`.l-hero__text { display: contents }` и `grid-template-areas` раскладывают элементы так:
`"title" "lead" "cta" "meta" "stage"`. В сцене и в QR нет фокусируемых элементов, поэтому
визуальный порядок не расходится с порядком табуляции.

```css
@media (min-width: 960px) {
  .l-hero {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "title" "lead" "cta" "meta" "stage";
    justify-items: center;
    text-align: center;
    row-gap: 0;
    padding-block: var(--space-16) 0;
  }
  .l-hero__text { display: contents; }
  .l-hero__title { grid-area: title; max-width: 14em; }
  .l-hero__lead  { grid-area: lead; max-width: var(--l-measure-center); margin-top: var(--space-6); }
  .l-hero__cta   { grid-area: cta; max-width: none; margin-top: var(--space-8); }
  .l-hero__source{ grid-area: meta; margin-top: var(--space-2); }
  .l-hero__scene { grid-area: stage; width: 100%; margin-top: var(--space-16);
                   margin-bottom: calc(-1 * var(--l-stage-overlap)); position: relative; z-index: 1; }
  .l-hero__qr    { display: none; }   /* QR переезжает внутрь стенда */
}
```

`.l-cta__trust` (200+ и «lietotne vēl jauna») остаётся в `.l-hero__cta` под micro. Обе строки
caption, по центру, `max-width: 40em`. Это 2–3 короткие строки, а не абзац.

### 4.2. Масштаб H1

- `--l-size-hero: clamp(64px, 3.2vw + 34px, 80px)`: 960 → 65, 1200 → 72, 1280 → 75, ≥ 1440 → 80.
  Потолок 80 оставлен по `03a` §5.
- `line-height: 1` (`--l-lh-hero` на десктопе) вместо 0.95: без этого фон пилюли во второй строке
  задевает выносные элементы первой. Трекинг `--l-track-hero` (−0.035em) без изменений.
- **Две строки гарантирует разметка, а не случай.** Во всех четырёх словарях `hero.title` состоит
  из двух частей через «: » («Stundu saraksts: tagad un tālāk», «Расписание: сейчас и дальше»,
  «Timetable: now and next», «Розклад: зараз і далі»). `hero.ts` делит строку по первому «: » на
  два `<span class="l-hero__line">`. На ≥ 960 каждая часть `display: block`, ниже 960 — `inline`,
  так что телефон видит прежний текст с прежними переносами. Если двоеточия нет, заголовок
  выводится одной частью, без пилюли и без ошибки (тест на это обязателен).
- Ширина строк при 80 px (оценка 0.6 em на знак): LV «Stundu saraksts:» ≈ 770 px, «tagad un tālāk»
  + пилюля ≈ 740 px; RU «Расписание:» ≈ 530, «сейчас и дальше» + пилюля ≈ 780; UA «зараз і далі»
  ≈ 620. На 960 (65 px) самая длинная строка ≈ 640 px при контейнере 896. Запас есть на всех
  языках.

### 4.3. Инлайновая пилюля

**Слово:** то, что означает «сейчас», потому что именно это продукт и обещает, и то же слово
стоит на сцене ниже («Tagad» — `scene.now`). Пилюля в заголовке и строка «Tagad» на стенде образуют
один электрический жест («подпись 1» из `03a` §8: электрик значит «сейчас»).

| Язык | `hero.title` | Слово в пилюле (`hero.title.pill`, новый ключ) | Длина |
| --- | --- | --- | --- |
| LV | Stundu saraksts: **tagad** un tālāk | tagad | 5 |
| RU | Расписание: **сейчас** и дальше | сейчас | 6 |
| EN | Timetable: **now** and next | now | 3 |
| UA | Розклад: **зараз** і далі | зараз | 5 |

Копи не меняется: новый ключ только указывает, какое слово второй части обернуть. Компонент
ищет его как отдельное слово во второй части. Не нашёл — пилюли нет, текст не теряется. Тест
проверяет, что во всех четырёх языках пилюля найдена.

**Разметка** (внутри `<h1>`, текст заголовка для скринридера не меняется):

```html
<span class="l-hero__line">Stundu saraksts:</span>
<span class="l-hero__line"><span class="l-chip"><span class="l-chip__dot" aria-hidden="true"></span>tagad</span> un tālāk</span>
```

**Стиль** (только ≥ 960; ниже `.l-chip` без стилей, точка `display: none`):

```css
.l-chip {
  display: inline-flex; align-items: center; gap: 0.16em;
  padding: 0.04em 0.32em 0.08em 0.24em;
  border-radius: var(--l-radius-control);
  background: var(--l-chip-bg); color: var(--l-chip-fg);
  white-space: nowrap;            /* пилюля не рвётся */
  vertical-align: 0.02em;
}
.l-chip__dot {
  width: 0.22em; height: 0.22em; border-radius: 50%;
  background: var(--l-chip-dot);
}
```

- Перенос: пилюля `nowrap`, но остальная строка переносится свободно. При 200 % масштабе текста
  пилюля может уйти на новую строку целиком, и это допустимо.
- `overflow-wrap: anywhere` на H1 (`base.css`) пилюлю не ломает: внутри неё одно короткое слово.
- Контраст: blue-500 на blue-050 ≈ 6.0:1; тёмная тема: blue-200 на смеси 18 % blue-300 с
  `--l-surface` ≈ 7:1. Это крупный текст, нужен минимум 3:1.
- **Бюджет One Voice:** на первом экране электрик встречается ровно дважды: пилюля и кольцо
  «Tagad» на экране дня в стенде. Кольцо у карточки-виджета в стенде переводится в нейтральное
  (§4.5). Ссылки не в счёт, они `--l-link`.

### 4.4. Кнопки (DeviceCta на десктопе)

- **Набор `desktop`** (его видит почти каждый посетитель на ≥ 960): основная `primary lg`
  «Atvērt pārlūkā» (`hero.cta.desktop`, иконка `monitor`) и рядом новая тихая `quiet lg`
  «Android (APK)» (новый ключ `hero.cta.desktop.android`, одинаковый во всех языках, иконка
  `smartphone`). Тихая кнопка **ведёт на `#install-android`**, а не на `/download`: дисклеймер 3
  (`01c` §2) требует, чтобы предупреждение про APK стояло перед любой кнопкой загрузки, а в
  `#install-android` оно стоит первым. Текстовая ссылка «Android: lejupielādē APK» из этого набора
  уходит, её роль выполняет кнопка.
- **Тихая кнопка:** `.l-btn--quiet { background: var(--l-btn-quiet); color: var(--l-text-strong); }`,
  hover `--l-btn-quiet-hover`, без тени. Нейтральная, не синяя (Neutral Button). На синем поле
  финала `.l-final .l-btn--quiet { background: transparent; box-shadow: inset 0 0 0 2px
  var(--border-on-brand); color: var(--l-on-field); }`.
- **Раскладка наборов в hero и финале на ≥ 960** (без смены `display`, чтобы не задеть логику
  видимости наборов по `data-platform`):

```css
@media (min-width: 960px) {
  .l-hero .l-cta__set, .l-final .l-cta__set { justify-items: center; }
  .l-hero .l-cta__set[data-set="desktop"], .l-hero .l-cta__set[data-set="neutral"],
  .l-final .l-cta__set[data-set="desktop"], .l-final .l-cta__set[data-set="neutral"] {
    grid-template-columns: auto auto; justify-content: center; column-gap: var(--space-3);
  }
  .l-hero .l-cta__set > :not(.l-btn), .l-final .l-cta__set > :not(.l-btn) { grid-column: 1 / -1; }
  .l-hero .l-btn--block, .l-final .l-btn--block { width: auto; min-width: 200px; }
  .l-cta__links, .l-cta__inapp { justify-content: center; }
}
```

  Внимание: нельзя писать на ≥ 960 `.l-hero .l-cta__set[data-set="neutral"] { display: … }`.
  Специфичность (0,3,0) равна правилу `[data-platform] .l-cta__set[data-set="neutral"] { display:
  none }` (`hero.css:69`), и более позднее правило снова покажет нейтральный набор поверх
  платформенного.
- Наборы `android` / `ios` на ≥ 960 (Android-планшет в ландшафте, iPad): одна кнопка по центру,
  micro и ссылки под ней. Ничего не прячется.
- Высота: `lg` 54 px, минимальная ширина 200, промежуток 12. Нажатие — DS `scale(0.97)`.

### 4.5. Сцена-стенд: «продуктовый макет» из HTML/CSS

Это не скриншот и не мокап устройства (`03a` §1 запрещает рамки Pixel/iPhone и 3D). Это
**стенд**: большая скруглённая панель, на которой разложены три настоящие части продукта,
нарисованные DS-компонентами и подписанные как иллюстрация.

**Рамка:** `--l-sunken` фон, `--l-radius-stage` 36, `--l-ring-hairline` + `--l-shadow-raised`
(в тёмной теме DS гасит тень, остаётся inset-кольцо), `padding: var(--space-12)` (desk-s
`--space-8`), внутри `.l-grid12`, `align-items: center`, `min-height: 480px`. Ширина = контейнер
(1120 / 1200). Нижние 160 px (`--l-stage-overlap`) заходят на белую полосу фактов, которая
компенсирует их своим `padding-top: calc(var(--l-stage-overlap) + var(--space-16))`.

**Состав (desk-m / desk-l):**

| Колонки | Объект | Источник | Подпись |
| --- | --- | --- | --- |
| 1–3 | QrCard (160 × 160 + адрес) | `qr-card.ts` без изменений | `install.desktop.qr` (уже есть) |
| 4–8 | **Экран дня** (новый `dayScene`): карточка-экран шириной 400, фон `--l-bg`, радиус 36, `--l-shadow-raised`. Сверху eyebrow «Šodien» (новый ключ `scene.today`), ниже 4 урока анатомией `.l-lesson` (время, номер, предмет, кабинет · корпус). 3-й урок — «Tagad»: электрическое кольцо 2 px `--l-now`, полоса прогресса, «vēl 19 min» | `content/scene.ts`: `SCENE_CHANGES[0..2]` + `SCENE_NEXT` как 4-й (без отмены) | под стендом общий pill «Ilustrācija · piemērs» |
| 9–12 | **Виджет 2×1:** существующая `nowNextScene` (карточка «Tagad / Nākamā») | `scenes.ts` | `now.widgets.next.name` + «Android» (готовые ключи) |

Состав дня (все поля уже есть в `scene.ts`, ничего не выдумывается, имён преподавателей нет):

| № | Время | Предмет | Кабинет · корпус | Состояние |
| --- | --- | --- | --- | --- |
| 1 | 08:30–09:10 | Angļu valoda | 3 · TIC | прошёл (текст `--l-text-muted`) |
| 2 | 09:15–09:55 | Matemātika | 208 · Galvenā ēka | прошёл |
| 3 | 10:10–10:50 | Programmēšana | 214 · Galvenā ēka | **Tagad**, кольцо, прогресс 21/40 |
| 4 | 10:55–11:35 | Angļu valoda | 3 · TIC | Nākamā, `pēc 5 min` |

Смена корпуса между 3-м и 4-м уроком (Galvenā ēka → TIC) видна сама по себе: это тот вопрос
«kurā ēkā?», ради которого продукт существует.

- В карточке-виджете внутри стенда кольцо «now» нейтрализуется:
  `.l-stage .l-scene__row--now { box-shadow: inset 0 0 0 1px var(--border-hairline); }`. Так
  электрик остаётся только на экране дня (бюджет One Voice, §4.3).
- **desk-s (960–1199):** две колонки: экран дня в колонках 1–7, справа (8–12) виджет и под ним QR.
- **Ниже 960:** стенд не существует. `.l-hero__scene` показывает только `nowNextScene`, как сейчас.
  `dayScene` и QR внутри стенда имеют `data-desktop-only`.
- **Доступность:** у `dayScene` свой `role="img"` и `aria-label` (новый ключ `scene.day.aria`,
  полное описание примера, как у `scene.now.aria`). Pill «Ilustrācija · piemērs» стоит
  `figcaption` под стендом, по центру, видимо, а не только в `aria`.
- **Высота стенда** ≈ 40 (eyebrow) + 4 × 84 (урок + зазор) + 2 × 48 (padding) ≈ 470–500 px. На
  1440 × 820 видимой высоты верх стенда приходится примерно на y ≈ 600: видно 200+ px макета (как у
  Notion: макет «выглядывает»). На 1280 × 640 видно ≈ 100 px, этого достаточно, чтобы понять,
  что ниже есть продукт.
- **Никакого изображения в hero:** стенд — это HTML/CSS. LCP по-прежнему H1-текст. QR —
  `loading="lazy"` SVG ~1–2 KB.

---

## 5. Секции

### 5.0. Общий шаблон секции на ≥ 960

`questionSection` получает два необязательных пропа, которые на телефоне ничего не меняют:

- `layout: "split" | "split-rev" | "center" | "narrow"` → класс `l-q--split` и т. д.;
- `tone: "paper" | "white"` → `class="l-band" data-tone="…"` на самой `<section>`.

И одну правку разметки: заголовок, lead и выход оборачиваются в `<div class="l-q__intro">`. Это
устраняет разъезжание из §1 п. 4. Ниже 960 `.l-q__intro { display: contents }`, и мобильная сетка
снова видит детей по отдельности. Чтобы визуальный порядок на телефоне не изменился, ниже 960
нужны два правила `order` (DOM-порядок внутри intro отличается от прежнего):
`.l-q__exit { order: 2 }` (выход всегда последний) и `.l-q--split-rev .l-q__facts { order: 1 }`
(в `#changes` факты на телефоне идут после сцены, как сейчас). Подробнее — `#now` в §5.2.

```css
@media (min-width: 960px) {
  .l-q { grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: var(--l-col-gap);
         row-gap: var(--l-gap-head); align-items: center; }
  .l-q__intro { display: grid; gap: var(--l-gap-text); align-content: start; }
  .l-q__heading { max-width: var(--l-measure-head); }

  .l-q--split     .l-q__intro { grid-column: 1 / span 5; }
  .l-q--split     .l-q__proof { grid-column: 7 / -1; }
  .l-q--split-rev .l-q__intro { grid-column: 8 / -1; grid-row: 1; }
  .l-q--split-rev .l-q__proof { grid-column: 1 / span 6; grid-row: 1; }

  .l-q--center .l-q__intro { grid-column: 3 / span 8; justify-items: center; text-align: center; }
  .l-q--center .l-q__proof { grid-column: 1 / -1; }
  .l-q--narrow .l-q__intro { grid-column: 3 / span 8; justify-items: center; text-align: center; }
  .l-q--narrow .l-q__proof { grid-column: 3 / span 8; }   /* 1120 → ~736 px */
}
```

Старые правила `.l-q` 5fr/7fr, `grid-row: 1 / span 4` и `#install { grid-template-columns: 1fr }`
(`sections.css:290–317`) удаляются. Порядок в DOM остаётся «intro → proof», поэтому в `split-rev`
визуал слева, но для скринридера и табуляции текст идёт первым.

**Рейл секции на центрированных заголовках.** Подпись бренда 2 из `03a` §8 (4-px рейл перед
заголовком) сохраняется, но в центрированном варианте рейл горизонтальный: 32 × 4 px pill над H2,
по центру (`.l-q--center .l-q__head { grid-template-columns: 1fr; justify-items: center; }`,
`.l-q__rail { width: 32px; height: 4px; }`). В шахматке рейл остаётся вертикальным слева, как в
мобильной версии.

### 5.1. Таблица секций

| Секция | Тон | Раскладка | Слева / сверху | Справа / снизу | Визуал | Карточки |
| --- | --- | --- | --- | --- | --- | --- |
| Полоса фактов | white | центр, 1 ряд | — | — | 6 фактов с иконками (§6) | нет, только текст |
| `#now` | white | `split` (5 / 6, отступ 1 колонка) | рейл + H2 «Stunda, kabinets, ēka», lead, 3 факта (`factList`), выход «→ #install» | **стенд виджетов**: sunken-панель радиус 36, внутри два столбца: скриншот `week-view` (241 px, нативно, по центру столбца) и 3 карточки виджетов (`dl.l-widgets__list`) + callout iOS | `week-view.avif/webp/png` (существует, разрешён) | `.l-widgets__item` на sunken: белые, `--l-shadow-card` |
| `#changes` | paper | `split-rev` (визуал 1–6, текст 8–12) | `changesScene`, ширина 100 % колонки (≈ 540), карточки уроков как есть, подписи под сценой | рейл + H2, lead, 4 факта, caveat `l-note` | HTML-сцена с анимацией отмены (уже есть) | уроки на бумаге с `--l-shadow-card` (как сейчас) |
| `#offline` | white | `center` | рейл-тик, H2 по центру (без lead в копи) | 2 карточки в колонках 3–6 и 7–10 (`.l-pair` → 2 колонки по 4), под ними по центру выход «Sīkāk par privātumu» | иконка 24 px в карточке (`wifi-off`, `user-round-x`) | белые + `--l-ring-hairline`, padding 32, радиус 28 |
| `#install` | paper | `center` | H2 по центру | 3 карточки 4/4/4 (Android, iPhone, Dators) | QR в карточке «Dators» | белые + `--l-shadow-card`, padding 32; **subgrid** для выравнивания кнопок (ниже) |
| `#teachers` | white | `split` внутри `--panel` (sunken, радиус 36, padding 64) | рейл + H2, lead, note, «teachers.install», выход | 6 фактов сеткой 2 × 3 мини-карточек (иконка + текст) | — | мини-карточки белые + `--l-shadow-card` на sunken |
| `#more` | white | `center` | H2 по центру | 4 карточки в ряд (3/3/3/3); на 960–1199 2 × 2 | иконки 24 (`share-2`, `split`, `languages`, `sun-moon`) | белые + `--l-ring-hairline` |
| `#faq` | paper | `narrow` (колонки 3–10) | H2 по центру | один белый список-карточка: 8 `<details>`, разделённых hairline | — | одна карточка `--l-shadow-card`, внутри разделители |
| Финальный CTA | paper | центр | синий залив `--l-field` на контейнер, радиус 36, padding 96 / 64 | H2 по центру (до 22ch), предупреждение APK (≤ 40em), DeviceCta (как в hero), pill «Neoficiāls projekts» | — | — |
| Footer | sunken | 12 колонок: 1–4 / 5–8 / 9–12 | бренд (mark + Stundio), `footer.disclaimer`, `footer.source` | `#privacy` целиком: заголовок, 3 абзаца, ссылка, opt-out | ссылки (вертикально), `langNav(full)`, кнопка «Atvērt Stundio» | — |

### 5.2. Что менять по секциям

**Полоса фактов** — новый компонент, §6.

**`#now`**
- `sections.ts nowSection`: `layout: "split", tone: "white"`, факты передаются новым слотом
  `facts` в `questionSection` и рендерятся внутри `.l-q__intro` после lead (`<div
  class="l-q__facts">`). Proof = `.l-widgets` + `screenshotFrame` в обёртке `<div
  class="l-showcase">`.
- Стенд `.l-showcase` на ≥ 960: `display: grid; grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-8); align-items: center; padding: var(--space-12); background:
  var(--l-sunken); border-radius: var(--l-radius-stage)`. Скриншот слева, карточки виджетов
  справа. Порядок в DOM `widgets → shot`, на десктопе скриншот ставится первым через
  `order: -1` (в нём нет фокусируемого).
- **Как не сломать телефон.** Ниже 960 `.l-q__intro` и `.l-showcase` — `display: contents`.
  Визуальный порядок остаётся прежним (head → lead → facts → widgets → shot → exit), если:
  `.l-q__exit { order: 2 }` (выход в DOM теперь внутри intro, визуально он должен остаться
  последним) и `.l-q__facts { margin-top: calc(var(--l-gap-block) - var(--l-gap-text)) }`
  (вместе с `gap` секции 12 даёт прежние 24 между lead и фактами и между фактами и виджетами).
  Порядок табуляции не меняется по сути: в proof `#now`, `#teachers` и `#offline` нет
  фокусируемых элементов, выход и так был единственной ссылкой. Проверка: скриншоты 360/390 до и
  после совпадают (§8.4-1).
- `.l-shot { justify-items: center }` на ≥ 960 (сейчас `start`); ширина не больше нативных 241 px
  (`03a` §3.3).

**`#changes`**
- `layout: "split-rev", tone: "paper"`. Факты и caveat переходят в intro (тот же `facts`).
  В proof остаётся только `changesScene`. На телефоне факты остаются под сценой за счёт `order: 1` (§5.0).
- `.l-changes` в desk: `max-width: 560px; justify-self: center`. Подписи (2 pill) по центру под
  списком.

**`#offline`**
- `layout: "center", tone: "white"`. `.l-pair` на ≥ 960: `grid-template-columns: repeat(2,
  minmax(0, 1fr)); grid-column: 3 / span 8`. Карточка: `box-shadow: var(--l-ring-hairline)`
  вместо `--l-shadow-card` (white-on-white), `padding: var(--space-8)`, иконка 24 сверху, `h3`
  22 px. `.l-q__exit` по центру под карточками.

**`#install`**
- `layout: "center", tone: "paper"`. Панели становятся карточками на ≥ 960:
  `.l-install__panel { padding: var(--space-8); border-radius: var(--l-radius-card); background:
  var(--l-surface); box-shadow: var(--l-shadow-card); }`.
- **Выравнивание кнопок.** Каждая панель делится на 4 смысловых ряда: заголовок / вводная
  (у Android: why + callout APK; у iPhone: lead; у «Датора»: lead) / кнопка / остальное. В разметке
  `panel()` вводная оборачивается в `<div class="l-install__intro">`, остальное — в
  `<div class="l-install__rest">`. На ≥ 960:
  `.l-install { grid-template-rows: auto auto auto 1fr; }`,
  `.l-install__panel { grid-row: span 4; display: grid; grid-template-rows: subgrid; }`.
  Кнопки трёх путей встают на одну линию. Ниже 960 обёртки `display: contents`.
- QR в «Даторе» остаётся (это справочное место), в hero он в стенде. Дубль допустим, потому что
  они на разных экранах прокрутки.
- `install-tabs.ts` уже отступает на ≥ 960, его не трогать.

**`#teachers`**
- `layout: "split", tone: "white", variant: "panel"`. `.l-q--panel` на ≥ 960:
  `padding: var(--space-16); border-radius: var(--l-radius-stage)`.
- Факты (6) в proof: `.l-facts--compact` → `grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3)`. Каждый `li` — мини-карточка `padding: var(--space-4) var(--space-5);
  background: var(--l-surface); border-radius: var(--l-radius-callout); box-shadow:
  var(--l-shadow-card)`.

**`#more`**
- `layout: "center", tone: "white"`. Факты как сетка карточек: на ≥ 1200
  `grid-template-columns: repeat(4, minmax(0, 1fr))`, на 960–1199 `repeat(2, …)`. Карточка:
  иконка 24 сверху, текст 16 px, `--l-ring-hairline`, padding 24–32, радиус 28. Новых текстов нет.
- `#teachers` и `#more` стоят на одной белой полосе подряд. Между ними обычный
  `--l-gap-section`, не двойной: у `#more` `padding-top: 0`, если перед ним белая полоса
  (`.l-band[data-tone="white"] + .l-band[data-tone="white"] { padding-top: 0 }`, то же для
  полосы фактов и `#now`).

**`#faq`**
- `layout: "narrow", tone: "paper"`. `.l-faq` на ≥ 960: `gap: 0; background: var(--l-surface);
  border-radius: var(--l-radius-card); box-shadow: var(--l-shadow-card); overflow: clip;`.
  Элементы: `box-shadow: none; border-radius: 0;`, разделитель
  `.l-faq__item + .l-faq__item { box-shadow: inset 0 1px 0 var(--border-hairline); }`.
  Вопрос: `padding: var(--space-5) var(--space-8)`, ответ ограничен `60ch`. Кольцо фокуса
  `summary` должно остаться видимым внутри `overflow: clip`: `outline-offset: -2px` на ≥ 960.

**Финальный CTA**
- `final-cta.ts`: обернуть `.l-final` в полосу (`l-band`, paper), чтобы синий залив оставался
  карточкой внутри контейнера, а не уходил на всю ширину. Залив на всю ширину — второй вариант,
  но тогда он спорит с hero-стендом по весу.
- На ≥ 960: `justify-items: center; text-align: center; padding: var(--space-16) var(--space-12)`
  (на ≥ 1200 `96px 64px`); `.l-final__title { font-size: var(--l-size-h2); max-width: 22ch }`;
  `.l-final__warn { max-width: 40em }`; убрать `.l-final .l-cta { max-width: 420px }`. Кнопки
  через правила §4.4.

**Footer**
- `footer.css` на ≥ 960: `grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap:
  var(--l-col-gap); row-gap: var(--space-6); align-items: start;`. Первая колонка-группа
  (1–4): новый маленький бренд-блок (mark + «Stundio», тот же `mark()`) + `footer.disclaimer` +
  `footer.source`. `#privacy` — колонки 5–8. Ссылки, языки и кнопка — 9–12, ссылки
  вертикально. Это требует обернуть первые два `<p>` в `<div class="l-footer__about">`, а
  ссылки, языки и кнопку — в `<div class="l-footer__aside">`; ниже 960 обёртки
  `display: contents`.
- Мера: каждая колонка ≤ 60ch автоматически (≈ 360 px). Верхний радиус оставить.

---

## 6. Полоса фактов под hero (вместо логотипов)

Клиентов, прессы и отзывов нет, выдумывать их нельзя (`01c` §2). Честный аналог полосы логотипов —
**строка проверяемых фактов**: тот же спокойный ряд одинаковых элементов, только вместо логотипов
иконка Lucide и 2–4 слова. Только claims со статусом **можно**.

| # | Иконка (есть в `icons/paths.ts`) | LV | RU | EN | UA | Claim `01c` |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `wifi-off` | Rāda bez interneta | Показывает без сети | Shows offline | Показує без мережі | #1 (формулировка «показывает без сети», не «всегда актуально») |
| 2 | `user-round-x` | Bez konta | Без аккаунта | No account | Без акаунта | #5 |
| 3 | `building-2` | Ēka un kabinets | Корпус и кабинет | Building and room | Корпус і кабінет | #25 |
| 4 | `smartphone` | 3 Android logrīki | 3 виджета Android | 3 Android widgets | 3 віджети Android | #2, #3 |
| 5 | `languages` | 4 valodas | 4 языка интерфейса | 4 interface languages | 4 мови інтерфейсу | #8 («язык = интерфейс») |
| 6 | `shield-check` | Atvērts kods, MIT | Открытый код, MIT | Open source, MIT | Відкритий код, MIT | #19 (перед публикацией проверить `LICENSE` в корне) |

Не включать: «200+» (claim «осторожно», он уже есть в hero как текст доверия), «бесплатно» (верно,
но спорит за внимание; при желании автор может заменить им #3), «Google Play», любые цифры визитов.

**Разметка:** `<section class="l-facts-strip l-band" data-tone="white" aria-label="…">` с
`<ul>` из 6 `<li>` (иконка `aria-hidden` + текст). `aria-label` — новый ключ `strip.label`
(«Īsumā» / «Коротко» / «At a glance» / «Коротко»). Видимого заголовка нет, как у Notion.

**Вид:** один ряд `display: flex; justify-content: center; flex-wrap: wrap; gap: var(--space-4)
var(--space-10)`. Элемент: иконка 20 px `--l-text-muted` + текст 15 px / 600 `--l-text`. Без
карточек и разделителей. На 960–1199 — 3 × 2 (`grid-template-columns: repeat(3, auto);
justify-content: center`). Полоса стоит сразу под стендом: `padding-top: calc(var(--l-stage-overlap)
+ var(--space-16)); padding-bottom: var(--space-16)`.

**Ниже 960:** полоса `display: none`, в мобильный контракт она не входит. Все эти факты на
телефоне уже есть в секциях. Если автор захочет полосу и на телефоне, это отдельное решение
(2 × 3 мелким шрифтом), не в рамках этой спеки.

Новые ключи: `strip.label`, `strip.offline`, `strip.account`, `strip.building`, `strip.widgets`,
`strip.langs`, `strip.source`. Добавить в `02b-copy.md` при реализации.

---

## 7. Motion, тёмная тема, a11y, производительность

### 7.1. Motion: максимум три момента (все уже частично есть)

1. **Прогресс урока** (`l-grow`, `scene.css`) — без изменений. На десктопе он идёт в кольце
   «Tagad» на экране дня внутри стенда (тот же класс `.l-progress__fill`). У прогресса виджета
   анимацию в стенде отключить (`.l-stage .l-scene__card .l-progress__fill { animation: none }`),
   чтобы одновременно не росли две полосы.
2. **Отмена урока в `#changes`** (`changes-anim.ts`) — без изменений.
3. **Hairline шапки на скролле** (§3.2) — CSS scroll-timeline, только `background-color` и
   `box-shadow` на одном элементе. Под `reduce` состояние фиксировано.

Плюс DS-нажатие `scale(0.97)` (не сюжет) и `scroll-behavior: smooth` только под
`no-preference`. **Не добавлять:** появление стенда, scroll-reveal секций, параллакс, hover-подъём
карточек, анимацию пилюли (точка не пульсирует: бесконечный цикл против `03a` §6).

### 7.2. Тёмная тема на десктопе

- Полосы: paper = `--l-bg` #0b0c10, white = `--l-surface` #16181f, sunken = `--l-sunken`
  #101219. Последовательность полос из §2.6 сохраняется.
- Стенд: `--l-sunken` + inset hairline; `--l-shadow-raised` в тёмной DS-теме не тонированный
  (Blue-Shadow Rule). Проверить, что `ds-dark.css` действительно переопределяет `--shadow-raised`;
  если нет, под `prefers-color-scheme: dark` добавить `--l-shadow-stage: var(--l-ring-hairline)`.
- Кольцо «Tagad» — `--l-now` = blue-300 (уже в `tokens.css`). Пилюля — `--l-chip-*` из §2.2.
- Тихая кнопка: `--border-hairline` #262a35 с `--l-text-strong` — контраст ≫ 4.5.
- Шапка на скролле: `--l-bg` + hairline #262a35.
- QR-карточка остаётся белой в обеих темах (`qr-card.ts`, так задумано).

### 7.3. Доступность

- **Фокус:** глобальное кольцо `:focus-visible` 2 px `--l-focus`, offset 2 (`base.css`). Новые
  места: пункты `.l-nav` (кольцо на pill), тихая кнопка, `summary` внутри FAQ-списка (offset −2,
  §5.2), ссылки в подвале. На синем поле — белое кольцо (уже есть).
- **Sticky-шапка не перекрывает фокус** (WCAG 2.4.11): `scroll-padding-top` (§3.2). Проверить
  Tab-обход снизу вверх: фокус на ссылке FAQ не должен прятаться под шапкой.
- **Порядок:** DOM не меняется, перестановки только визуальные и только для нефокусируемых узлов
  (сцена, QR, визуалы `split-rev`). Порядок табуляции = порядок чтения.
- **Ориентиры:** `<nav aria-label="Sadaļas">` в шапке отделён от `<nav aria-label="Valoda">`
  (переключатель) и от `<nav>` ссылок подвала. У каждого своё имя.
- **Контраст по токенам:** muted на paper 5.9, на white 6.3; muted на sunken (#edeff4) ≈ 5.6
  (AA); чип 6.0 / 7.2; тихая кнопка ink-900 на ink-200 ≈ 15. Тёмная: muted на surface 6.9.
  Электрик на тёмном не используется (blue-300).
- **Целевые размеры:** всё интерактивное ≥ 44 px в высоту, соседние цели через ≥ 8 px.
- **200 % текста:** H1 вырастет до 4 строк, пилюля перенесётся целиком; горизонтального скролла
  быть не должно (проверить на 1280).

### 7.4. Производительность (бюджет `03a` §7)

- **Ни одного нового изображения.** Стенд и полоса фактов — HTML/CSS и уже существующие иконки.
  `week-view` и QR уже в бюджете и грузятся лениво.
- **Ни одного байта нового JS.** Шапка — CSS, пилюля — разметка при сборке, навигация — якоря.
- **CSS:** прирост оценочно 3–4 KB несжатого (≈ 1–1.3 KB gzip) на весь десктопный слой. Это
  ложится в инлайн-CSS ≤ 14 KB сжатыми вместе с HTML; проверить `build/built-css.test.ts` и при
  необходимости поднять лимит теста только после замера.
- **HTML:** стенд добавляет ~1.5 KB разметки (4 урока + обёртки), полоса фактов ~0.6 KB. На
  телефоне она есть в HTML, но не отрисовывается (`display: none`). Это допустимо, но учитывать в
  14 KB первого RTT.
- **LCP** остаётся H1-текстом. Стенд — блочный HTML без изображений, CLS 0, потому что все размеры
  задаются сеткой.
- `content-visibility: auto` на полосах ниже первого экрана (`.l-band:not(.l-hero)`) с
  `contain-intrinsic-size: auto 800px` — по желанию, после замера. Помогает длинной странице на
  слабых ноутбуках, но не обязателен.

---

## 8. Порядок реализации

Приоритет: что сильнее всего меняет ощущение «набросано» при наименьшем риске для мобильной
версии.

### 8.1. P0 — каркас и hero (основной эффект)

| # | Файл | Правка |
| --- | --- | --- |
| 1 | `styles/tokens.css` | Токены §2.2 (три брейкпоинта + тёмный чип). Убрать старое `--l-size-hero: clamp(64px, 6.25vw, 80px)` |
| 2 | `styles/layout.css` | ≥ 960: `.l-main` без ограничения и без `gap`, класс `.l-band` + `data-tone`, правило «white + white → padding-top 0», `.l-grid12`. Шапка на всю ширину (padding-формула) |
| 3 | `components/hero.ts` | Разделение `hero.title` по «: » на две `.l-hero__line`, пилюля по `hero.title.pill`; `.l-hero` получает `l-band` + `data-tone="paper"`; стенд: `nowNextScene` + `dayScene` (`data-desktop-only`) + `qrCard` (`data-desktop-only`) внутри `.l-hero__scene`, класс `.l-stage` на ≥ 960; убрать отдельный `.l-hero__qr` |
| 4 | `components/scenes.ts`, `content/scene.ts` | `dayScene(ctx)`: 4 урока из существующих констант (экспортировать `SCENE_DAY`, собранный из `SCENE_CHANGES[0..2]` и `SCENE_NEXT`, без отмены); `role="img"` + `scene.day.aria` |
| 5 | `styles/components/hero.css` | Блок ≥ 960 из §4.1 вместо `1fr 380px`; `.l-chip`, `.l-hero__line`; стенд `.l-stage` (рамка, 12 колонок, перекрытие); раскладка наборов CTA §4.4 |
| 6 | `components/device-cta.ts`, `primitives.ts`, `styles/components/button.css` | Вариант `quiet` у `button()`; в наборе `desktop` текстовая ссылка → кнопка `quiet` «Android (APK)» → `#install-android`; `.l-btn--quiet` + вариант на поле |
| 7 | `i18n/{lv,ru,en,ua}.ts` | Новые ключи: `hero.title.pill`, `hero.cta.desktop.android`, `scene.today`, `scene.day.aria`, `header.navLabel`, `nav.*`, `strip.*` |
| 8 | `components/header.ts`, `styles/components/header.css` | `<nav class="l-nav">` с 5 якорями + кнопка `footer.open`; сетка `1fr auto 1fr`; скрытие < 960 (nav, кнопка) и 960–1199 (кнопка); sticky + scroll-timeline + reduce-фолбэк (после ответа автора, §9-1; до ответа `position: static`, остальное делать) |
| 9 | `styles/base.css` | ≥ 960: `scroll-padding-top` под шапку; `scroll-behavior: smooth` только при `no-preference` |

### 8.2. P1 — секции

| # | Файл | Правка |
| --- | --- | --- |
| 10 | `components/question-section.ts` | Пропы `layout`, `tone`, `facts` (слот после lead); обёртка `.l-q__intro`; классы `l-band`, `data-tone` |
| 11 | `styles/components/sections.css` | Удалить старый блок ≥ 960 (`5fr 7fr`, `span 4`, `#install 1fr`); добавить §5.0; горизонтальный рейл для center/narrow; `.l-q__intro { display: contents }` ниже 960 |
| 12 | `components/sections.ts` | Каждой секции её `layout` / `tone` по таблице §2.6; `#now` и `#changes` переносят факты в `facts`; `.l-showcase` вокруг widgets + shot в `#now` |
| 13 | `components/sections.ts` (новая функция `factsStrip`), `render.ts` | Полоса фактов между `hero` и `nowSection`; `styles/components/sections.css` или новый `strip.css` (тогда импорт в `index.css`) |
| 14 | `styles/components/install.css`, `sections.ts panel()` | Карточки панелей, обёртки `__intro` / `__rest`, subgrid-выравнивание кнопок |
| 15 | `styles/components/sections.css` | `#offline`, `#more`: hairline-карточки; `#teachers`: панель 64 + мини-карточки 2 × 3; `.l-shot` по центру |
| 16 | `styles/components/faq.css` | Узкая колонка, один список-карточка с hairline-разделителями, фокус |

### 8.3. P2 — финал и подвал

| # | Файл | Правка |
| --- | --- | --- |
| 17 | `components/final-cta.ts`, `styles/components/final.css` | Центр, кнопки как в hero, `max-width` у заголовка и предупреждения; полоса paper вокруг |
| 18 | `components/footer.ts`, `styles/components/footer.css` | Обёртки `__about` / `__aside`, бренд-блок, 12 колонок 4/4/4 |
| 19 | `styles/components/scene.css` | В стенде: нейтральное кольцо виджета, отключение второй анимации прогресса |

Тесты: `pages.test.ts` / `html.test.ts` — пилюля найдена во всех четырёх языках; H1 без «: »
выводится без пилюли; `dayScene` без имён (проверка по списку предметов); ключи всех четырёх
словарей совпадают; `.l-nav` содержит ровно 5 якорей, и все существуют на странице.

### 8.4. Критерии приёмки

Проверить в браузере (сейчас браузера для визуальной проверки нет, это задача для 3.4/3.5).
Ширины **1280 × 800, 1440 × 900, 1920 × 1080**, плюс контрольно 960 и 1199; LV и RU (самые
длинные строки); светлая и тёмная тема.

1. **Мобильный контракт:** на 360, 390 и 959 px страница пиксельно совпадает с текущей (сравнить
   скриншоты до и после): нет пилюли, стенда, полосы фактов, навигации, шапка 56 и не sticky.
2. H1 ровно в 2 строки на всех трёх ширинах и в четырёх языках; пилюля целиком в строке 2, не
   задевает строку 1, не обрезана.
3. На 1440 × 900 над сгибом: шапка, H1, lead, обе кнопки, micro и ≥ 150 px стенда. На 1280 × 800
   над сгибом видны кнопки и ≥ 60 px стенда.
4. Стенд перекрывает границу paper/white; полоса фактов не налезает на стенд; на 1920 стенд не
   шире 1200.
5. Ровно два электрических элемента на первом экране: пилюля и кольцо «Tagad» на экране дня.
6. Кнопки hero и финала: auto-ширина, по центру, на одной линии; без JS (нейтральный набор) две
   кнопки в ряд; с `?platform=android|ios|desktop` показывается ровно один набор.
7. Во всех секциях-шахматках подпись-выход стоит сразу под текстом, а не посреди колонки (баг
   §1 п. 4 устранён).
8. В `#install` три основные кнопки на одной горизонтали.
9. FAQ — одна колонка ≤ 740 px по центру; открытый вопрос виден целиком, кольцо фокуса на `summary` не обрезано.
10. Шапка: навигация по центру экрана (±4 px), на скролле появляется hairline, без blur; переход
    по якорю не прячет заголовок секции под шапкой; Tab по всей странице — фокус всегда виден.
11. Подвал: три колонки, ни одной строки длиннее ~70 знаков.
12. Тёмная тема: полосы различимы, карточки на «белых» полосах видны благодаря inset-кольцу, текст
    пилюли читается.
13. 200 % масштаб текста на 1280: нет горизонтального скролла.
14. Lighthouse desktop: CLS < 0.05, LCP-элемент — H1; инлайн-CSS + HTML ≤ 14 KB gzip (или
    обоснованный пересмотр лимита в тесте); JS не вырос.
15. `prefers-reduced-motion: reduce`: прогресс сразу заполнен, отмена уже отменена, шапка с
    hairline статично, плавной прокрутки нет.

---

## 9. Открытые вопросы

| # | Вопрос | Почему важно | Предложение по умолчанию |
| --- | --- | --- | --- |
| 1 | Разрешить sticky-шапку **на десктопе**? DS запрещает sticky top bar, `02a` §5 тоже | Навигация по якорям на длинной странице полезна, только если она видна | Да на ≥ 960 (нижней плашки там нет, правило «один fixed» соблюдено). До ответа — `position: static`, hairline только как граница, остальное делать |
| 2 | Навигация в шапке противоречит `02a` §5 («без ссылок на секции») | `02a` решал для телефона; на десктопе 5 якорей не мешают первому экрану | Навигация только ≥ 960; на телефоне остаётся решение `02a` |
| 3 | FAQ узкой колонкой вместо двух (`02a` §6) | Отступление от IA | Узкая колонка (бриф автора + читаемость) |
| 4 | Тексты новых ключей (`nav.*`, `strip.*`, `scene.today`, `hero.title.pill`, `hero.cta.desktop.android`) | Новые строки RU/UA требуют вычитки носителем (`02-sections` уже держит этот вопрос открытым) | Использовать предложенные, внести в `02b-copy.md` |
| 5 | Факт «Atvērts kods, MIT» в полосе | `01c` #19: перед публикацией проверить `LICENSE` в корне и публичность репо | Проверить; если нет — заменить на «Bez maksas» (#18) |
| 6 | H2 48 px на ≥ 1200 сверх таблицы `03a` §2 | Небольшое расширение landing-шкалы | Принять, обновить `03a` §2 |
| 7 | Финальный синий CTA — карточка в контейнере или залив на всю ширину | Вес относительно hero-стенда | Карточка в контейнере (радиус 36) |
| 8 | Экран дня в стенде показывает 4 урока из примера; не будет ли «Šodien» прочитано как реальный сегодняшний день | `03a` §3.4: пример не должен выглядеть данными посетителя | Pill «Ilustrācija · piemērs» под стендом обязателен; времени «сейчас» в шапке экрана нет; дата не показывается |
| 9 | Скриншот `week-view` (1×, тёмный) рядом с HTML-стендом | На ретине будет мягким; тёмный на светлой полосе | Оставить в `#now` в нативных 241 px; при пересъёмке (`02c`) заменить на 3× в обеих темах |
| 10 | `color-mix()` для тёмного фона чипа | Поддержка браузерами широкая, но это первый `color-mix` на лендинге | Принять; фолбэк — `--blue-900` фоном и `--blue-200` текстом (контраст ≈ 9:1) |
