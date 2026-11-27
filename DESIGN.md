---
name: Stundio
description: A confident, offline-first timetable companion built on the Night / Day design system — slate and lamplight, liquid-glass chrome, dusk-toned by subject.
colors:
  lamp: "#f2b56b"
  lamp-ink: "#2a1700"
  lamp-mark-day: "#b5680f"
  lamp-text-day: "#8f4d07"
  lamp-text-night: "#f4bd7a"
  lamp-glow-day: "rgba(181, 104, 15, 0.2)"
  lamp-glow-night: "rgba(242, 181, 107, 0.26)"
  day-ground: "#ebeaee"
  day-card: "#f8f8fa"
  day-raised: "#ffffff"
  day-sunken: "#e0dfe5"
  day-panel: "#dedce6"
  day-ink: "#121419"
  day-body: "#2e3038"
  day-muted: "#5d606b"
  day-hairline: "#d3d2da"
  day-border-strong: "#7c7f8b"
  night-ground: "#0d1117"
  night-card: "#161c24"
  night-raised: "#1c232d"
  night-sunken: "#0a0e13"
  night-panel: "#1a222c"
  night-ink: "#f1eee8"
  night-body: "#c4c1bb"
  night-muted: "#8e959f"
  night-inverse: "#ece8e1"
  night-hairline: "#252d38"
  night-border-strong: "#69717e"
  on-deep: "#f6f4f0"
  shade: "#05070a"
  tone-sage: "#b3cfa1"
  tone-sage-ink: "#1f3415"
  tone-mist: "#a9bfe6"
  tone-mist-ink: "#162a4d"
  tone-lavender: "#c3b4ea"
  tone-lavender-ink: "#2b1e52"
  tone-rose: "#eeaeb8"
  tone-rose-ink: "#4f1621"
  tone-teal: "#8fd0c8"
  tone-teal-ink: "#0f3733"
  tone-indigo: "#5a5fb0"
  tone-indigo-ink: "#f3f2ff"
  positive-day: "#1d7a49"
  positive-night: "#7fd1a1"
  caution-fill: "#e6cf7a"
  caution-text-day: "#7a6200"
  caution-ink: "#2b2300"
  danger-day: "#c0352a"
  danger-night: "#ff8a7a"
  on-danger-day: "#ffffff"
  on-danger-night: "#200604"
typography:
  wordmark:
    fontFamily: "Moho Condensed, Archivo Narrow, Arial Narrow, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "0.005em"
  hero:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  body-lg:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "normal"
  body:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
  data:
    fontFamily: "Martian Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
    fontFeature: "tabular-nums"
rounded:
  xs: "10px"
  sm: "16px"
  md: "22px"
  lg: "30px"
  xl: "22px"
  2xl: "30px"
  pill: "999px"
  squircle: "30%"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
  16: "64px"
  gutter: "20px"
  card-gap: "12px"
  section: "28px"
  topbar: "56px"
  status-bar: "36px"
  nav-height: "64px"
  nav-inset: "16px"
  tap-min: "44px"
  screen-max: "430px"
components:
  button-primary:
    backgroundColor: "{colors.day-ink}"
    textColor: "{colors.on-deep}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.day-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger-day}"
    textColor: "{colors.on-danger-day}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  card:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-body}"
    rounded: "{rounded.xl}"
    padding: "16px"
  subject-card-deep:
    backgroundColor: "{colors.tone-indigo}"
    textColor: "{colors.on-deep}"
    rounded: "{rounded.2xl}"
    padding: "12px"
  lesson-card:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.xl}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-body}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: "32px"
  chip-selected:
    backgroundColor: "{colors.day-ink}"
    textColor: "{colors.on-deep}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: "32px"
  badge:
    backgroundColor: "{colors.day-ink}"
    textColor: "{colors.on-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 9px"
    height: "22px"
  badge-lamp:
    backgroundColor: "{colors.lamp}"
    textColor: "{colors.lamp-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 9px"
    height: "22px"
  text-field:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "52px"
  icon-button:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-ink}"
    rounded: "{rounded.pill}"
    size: "44px"
  segmented-track:
    backgroundColor: "{colors.day-sunken}"
    textColor: "{colors.day-muted}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-item-active:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: "36px"
  switch-track:
    backgroundColor: "{colors.day-sunken}"
    rounded: "{rounded.pill}"
    height: "32px"
    width: "54px"
  switch-track-on:
    backgroundColor: "{colors.lamp}"
    rounded: "{rounded.pill}"
    height: "32px"
    width: "54px"
  week-grid-cell:
    backgroundColor: "{colors.tone-mist}"
    textColor: "{colors.tone-mist-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    height: "40px"
  week-grid-cell-empty:
    backgroundColor: "{colors.day-sunken}"
    rounded: "{rounded.xs}"
    height: "40px"
  bottom-nav:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-ink}"
    rounded: "{rounded.pill}"
    padding: "6px"
    height: "64px"
  date-dock:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 6px"
    height: "44px"
  now-dock:
    backgroundColor: "{colors.tone-indigo}"
    textColor: "{colors.on-deep}"
    rounded: "{rounded.pill}"
    height: "52px"
  bottom-sheet:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-body}"
    rounded: "{rounded.2xl}"
    padding: "10px 20px 24px"
  sync-status:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "30px"
  empty-state:
    backgroundColor: "{colors.day-card}"
    textColor: "{colors.day-muted}"
    rounded: "{rounded.xl}"
    padding: "36px 24px"
---

# Design System: Stundio

## Overview

**Creative North Star: "The Confident Companion"**

Stundio is a pocket-sized assistant with a strong voice. It does not present the school's timetable
apologetically or neutrally — it takes a position on what matters right now, sets it large, and gets
out of the way. Its signature is Night: a deep slate ground, soft graphite surfaces and warm
off-white ink, like lamplight on grey cotton, with one warm lamp (`#f2b56b`) marking the lesson on
now. Day is the same system turned over: lilac-grey paper, ink-dark text, the same lamp deepened to
stay legible. The personality still comes from decisiveness — scale, roundness, and the willingness
to commit to a single light — not from ornament, mascots or illustration.

The system is dense with information but generous with form. Cards are 22px-rounded and unbordered;
everything interactive is a pill; the chrome is liquid glass (frosted, saturated, edged with a 1px
specular rim) so content passes visibly beneath it; and the six subject tones are dusk colours
carrying their own ink so a colour-coded surface is still full-contrast text. Brand is ink, not
colour: the selected state and the primary button flip to the theme's inverse. Theme is a first-class
user setting (`.dark` on `<html>`, "system" follows the OS), not a media query: only semantic aliases
re-point, never a base step.

It is built for one hand in a corridor: a 430px phone design width, a 44px minimum hit target, and a
reader who has about two seconds. Confirmed anti-references: **EduPage's own UI** (dense grey tables,
server-supplied subject colours with no contrast guarantee, information buried behind taps),
**Material 3 and stock Android** (the system has its own form language and does not drift toward
Material components, elevation, or colour roles), and **generic dashboard SaaS** (slate-and-indigo
Tailwind defaults, hairline-bordered rectangles, desktop data-table density).

**Key Characteristics:**

- Two themes, one system: Night (signature) and Day, alias-driven.
- One lamp: the lesson on now and a switch that is on, nothing else.
- Brand is ink: selection and the primary button use inverse / on-inverse.
- Six dusk subject tones used strictly as an index, each with its own ink.
- Liquid-glass chrome and schedule slabs with a shared specular rim.
- Nothing is square: radii 10 / 16 / 22 / 30, pills for anything pressable.
- Times and countdowns in tabular Martian Mono; sentence case throughout.
- Depth is light, not lines: soft shadows by day, a faint rim and black float shadow at night.

## Colors

A cool slate-and-paper system lit by a single warm lamp, with six muted dusk subject tones and three signals.

### Primary

- **Lamp** (`#f2b56b`, `--lamp`): the one light. It marks the lesson on now and the switch that is on
  (and the `lamp` badge). Its companions: **Lamp Ink** (`#2a1700`) for text on a lamp fill; **Lamp
  Mark** (Day `#b5680f`, Night `#f2b56b`) for thin marks on a surface, deepened in Day to keep 3:1;
  **Lamp Text** (Day `#8f4d07`, Night `#f4bd7a`) for lamp-coloured words (Day is darker than the
  design's `#9a5208`, which measures 4.32:1 on the panel); **Lamp Glow** (Day `rgba(181,104,15,.2)`,
  Night `rgba(242,181,107,.26)`) for the soft light under the live glance panel.

### Neutral — Day

- **Day Ground** (`#ebeaee`): the app ground; never pure white, so a lighter surface always reads as a thing.
- **Day Card** (`#f8f8fa`) and **Day Raised** (`#ffffff`): cards and the highest surface.
- **Day Sunken** (`#e0dfe5`) and **Day Panel** (`#dedce6`): recessed tracks, quiet badges, skeleton base, and the panel wash.
- **Day Ink** (`#121419`): headings and the inverse fill; **Day Body** (`#2e3038`); **Day Muted** (`#5d606b`).
- **Day Hairline** (`#d3d2da`) and **Strong Border** (`#7c7f8b`): inset-ring separation and the off-switch ring.

### Neutral — Night

- **Night Ground** (`#0d1117`), **Night Card** (`#161c24`), **Night Raised** (`#1c232d`), **Night Sunken** (`#0a0e13`), **Night Panel** (`#1a222c`): surface contrast replaces shadow.
- **Night Ink** (`#f1eee8`), **Night Body** (`#c4c1bb`), **Night Muted** (`#8e959f`): warm off-white text.
- **Night Inverse** (`#ece8e1`): the brand/selected fill at night (ink flips to `#0d1117`).
- **Night Hairline** (`#252d38`) and **Strong Border** (`#69717e`).
- **On Deep** (`#f6f4f0`) and **Shade** (`#05070a`): theme-independent text and darkening ink for the full-colour subject field.

### Tertiary — the subject tones

Six dusk tones, identical in both themes, each with its ink pair: **Sage** (`#b3cfa1` / `#1f3415`),
**Mist** (`#a9bfe6` / `#162a4d`), **Lavender** (`#c3b4ea` / `#2b1e52`), **Rose** (`#eeaeb8` / `#4f1621`),
**Teal** (`#8fd0c8` / `#0f3733`), **Indigo** (`#5a5fb0` / `#f3f2ff` — the one dark tone). The persisted
settings keys did not change, so they map `amber→sage, sky→mist, lilac→lavender, pink→rose, mint→teal,
lime→indigo` (in code the utilities are still `bg-amber`, `bg-sky`, …). A subject gets one by hashing
its code (`subjectTone()`), so it is the same colour on every screen and device.

**Custom tones & colour wheel.** Users can recolour subjects in `CustomizationSheet` with the SVG
`ColorWheel` beside the six presets; the ink for any custom fill is computed by `readableInk()`.
Monochrome mode turns subject colour-coding off. **Group colours (teachers):** the sheet also lists
the groups a teacher teaches (`useSubjects().groups`); `Settings.groupColorOverrides`, keyed by
`groupToneKey` (lowercased class short), wins over the subject's colour on that group's lessons via
`lessonAccent()`, falling back to `subjectAccent()`. Students carry no `classes`, so group colours
never leak into a student's day.

### Signals

- **Positive** (Day `#1d7a49`, Night `#7fd1a1`), **Caution** (fill `#e6cf7a`, text Day `#7a6200` / Night `#e6cf7a`, ink `#2b2300`; a straw, deliberately apart from the lamp), **Danger** (Day `#c0352a`, Night `#ff8a7a`, with `on-danger` `#ffffff` / `#200604`). Offline reuses muted ink. These mean sync state and lesson state and nothing else.

### Named Rules

**The One Lamp Rule.** The lamp appears on at most two things per screen — the lesson on now and a switch that is on — and never on a button or a heading. Only the live glance panel glows (`shadow-brand` is that glow).

**The Index Rule.** The six subject tones are an index, not decoration: they make a subject recognisable and stay bound to it. They carry no meaning, ranking or mood; status has its own signals.

**The Contrast Invariant Rule.** Any custom subject colour is paired with a contrast-checked ink through `readableInk()`; a user tint never renders with fixed unverified text.

**The Alias-Only Rule.** Night re-points semantic aliases (`--bg-app`, `--surface-card`, `--text-muted`, `--bg-inverse`, …) and never a base step (`--ink-*`, `--accent-*`). The Day ink ramp is Day-only; reaching for a fixed `ink-900` is wrong at night.

**The Brand-Is-Ink Rule.** Selected states and primary buttons use `bg-inverse text-on-inverse` (`--brand` is ink, not a hue). Every `Button` and `IconButton` variant, and every text-styled control, is inverse, neutral glass, transparent, or danger — none fills with the lamp.

**The Server-Colour Rule.** EduPage's per-subject hex is never used: no contrast guarantee, and it breaks cross-device consistency.

## Typography

**Display Font:** Onest (with `system-ui`, `-apple-system`, sans-serif)
**Body Font:** Onest (same family — hierarchy is weight, size and tracking, not a second face)
**Data Font:** Martian Mono (with `ui-monospace`, `SFMono-Regular`, monospace)
**Wordmark:** Moho Condensed Black — licensed, shipped with the app, used for the `studio.` wordmark and the side rail's brand string only.

All faces are self-hosted: the app runs in a Capacitor WebView with no guaranteed network, and the
`latin-ext` subset is load-bearing because subject names arrive in Latvian (*Programmēšana*, *Angļu
valoda*).

**Character:** One humanist sans set heavy and tight at the top of the scale and calm in the middle,
paired with a wide monospace for anything that ticks. Sentence case everywhere; uppercase exists only
for the micro Label.

### Hierarchy

- **Hero** (700, 56px, 0.95, −0.035em): the one-per-screen statement (`u-hero`).
- **Display** (700, 40px, 1.0, −0.03em): screen titles (`h1`).
- **Headline** (700, 24px, 1.05, −0.03em): section headings and the top-bar title. Resized from the vendored 30px in the `index.css` mapping layer.
- **Title** (700, 18px, 1.15, −0.03em): the subject name on a card. Resized from the vendored 22px likewise.
- **Body Large** (500, 17px, 1.45): lead paragraph, sheet body.
- **Body** (500, 15px, 1.5): default UI text.
- **Caption** (500, 13px, 1.4): room, teacher, hints, chip labels.
- **Label** (700, 11px, 1.2, 0.02em, uppercase): eyebrows, badge text (`u-eyebrow`).
- **Data** (Martian Mono 500, 15px, 1.3, 0.01em, `tabular-nums`): every time, countdown and period boundary (`u-data`); the glance countdown is larger at 17px semibold.

### Named Rules

**The Tabular Time Rule.** Anything that is a time, a countdown, or a number that ticks is Martian Mono with `tabular-nums` (`u-data`). A clock that reflows as its digits change is a broken clock.

**The Tight Display Rule.** Display type is set big and tight — line-height at most 1.05, tracking never positive. If a heading must be small to fit, it is a Title.

**The Eyebrow Rule.** Uppercase appears only at Label size (11px) via `u-eyebrow`. Uppercase at body size or larger does not exist here.

## Layout

A single-column phone stack capped at `--screen-max` (430px on phones, centred beyond that) with a
constant 20px gutter, 12px between stacked cards and 28px between sections. Spacing is a 4px base
that leans on the larger steps (16, 20, 24, 28). Safe-area insets are read at the root as
`--app-inset-top` / `--app-inset-bottom` because the app runs full-bleed in the WebView; `--nav-safe`
(nav height 64 + inset 16 + 20 + safe inset, growing by 60px when a dock is mounted) reserves the end
of scrollable content.

Responsive: **phone** is the reference and takes no prefix. **Tablet** (≥768px wide and ≥500px tall)
raises `--screen-max` to 720px; **desktop** (≥1024px) to 880px. A phone in landscape stays on the phone
layout (the height floor). On tablet and desktop `SideNav` replaces the bottom stack (icon rail 84px
on tablet, 232px expanded on desktop), the status bar height is 0 and neither `StatusBar` nor
`DateDock` mounts; Home gains its `HomeSide` column and the glance banner.

**Phone chrome.** Two fixed layers frame the viewport: a read-only **StatusBar** (36px under the top
inset, sync freshness only, no interactive controls) and the **bottom stack** — `DateDock` (Home and
Week) or `NowDock` (a live or upcoming lesson), sitting 8px above the single-surface frosted `TabBar`.
Everything else scrolls, including each screen's own header (the 56px top bar is not sticky). The only
horizontal scroller is the class list, hiding its scrollbar (`no-scrollbar`).

**The Fixed Chrome Rule.** On phones exactly the StatusBar and the bottom stack are fixed; nothing else is. Wide layouts mount neither.

## Elevation & Depth

Depth is **light, not lines**, and the model differs by theme. In **Day**, shadows are soft, ink-tinted
(`rgba(18,20,25,…)`) and ranked: flat ground → sunken track → card → raised (sheet) → float (tab bar).
In **Night**, a shadow is invisible, so surface contrast does the work (`#0d1117` ground → `#161c24`
card → `#1c232d` raised), cards get only a faint top rim, and floating chrome drops to plain black. The
chrome itself is liquid glass: frosted, saturated, and edged with a 1px directional specular rim.

### Shadow Vocabulary

- **Card** (Day `0 1px 2px rgba(18,20,25,.05), 0 8px 20px -12px rgba(18,20,25,.14)`; Night `inset 0 1px 0 rgba(255,255,255,.05)`): resting cards, chips, inputs.
- **Raised** / **Nav** (Day `0 16px 36px -12px rgba(18,20,25,.24)`; Night `0 16px 40px -8px rgba(0,0,0,.7)`): bottom sheet, `NowDock`, featured deep fields.
- **Brand / glow** (Day `0 20px 44px -20px rgba(181,104,15,.32)`; Night `0 24px 60px -20px rgba(242,181,107,.32)`): the live glance panel only — the lamp's light, not an elevation step.
- **Inset Hairline** (`inset 0 0 0 1px var(--border-hairline)`): stands in for a border on card-on-card controls.
- **Glass chrome** (`--nav-glass-shadow`, Day `0 14px 36px -10px rgba(18,20,25,.18), 0 2px 10px -2px rgba(18,20,25,.08), inset 0 1px 0 rgba(255,255,255,.78)`): `.u-nav-glass` capsules; the schedule slabs, room capsules and live row have sibling `--schedule-*-shadow` tokens.

### Glass

`.u-nav-glass` (TabBar, DateDock, glass buttons) is a 180° white-to-grey gradient fill (Night: slate) with
`blur(20px) saturate(165%)` and a `::before` 1px rim drawn by `mask-composite: exclude` at 148°, bright
on the top-left and bottom-right curves. `.u-schedule-glass` (+ `-live`, `-chip`) shares that grammar at
`blur(20px) saturate(168%)`, rising to `24px / 190%` while the weather tile's ambient sky is expanded so
the slabs refract it. The splash screen's `WaveMark` (`.u-mark-glass-vessel`) uses the same frosted
grammar clipped to `mark.svg`, with contour-hugging top-left and bottom-right specular bevels via
shifted `mask-composite: exclude` layers, an ambient refraction field behind it, and a rising liquid
wave with a specular meniscus. Glass blur is also used by the glass `IconButton` variant (`--blur-glass`) and the
sheet scrim (`--blur-scrim`, 8px).

### Tone fields

`.u-tone-field` is the subject's grainy field: three radial gradients mixed only from the subject's tone,
its ink, `on-deep` and `shade`, plus an SVG fractal-noise grain at 32% overlay. `.u-tone-field-deep`
darkens the whole card toward `shade` so `on-deep` text holds 4.5:1; Indigo (`data-tone-dark`) darkens
toward `shade` instead of toward its light ink. These are the only gradients that carry colour in the
system (glass, buttons and tab bar use neutral sheen gradients), and no text sits on a bare gradient.

### Named Rules

**The Tinted-Card Rule.** A card filled with a subject tone gets no shadow; its colour already separates it. (The one featured deep field, the subject on now, takes `shadow-raised` as the lifted live object.)

**The Night Shadow Rule.** At night nothing is navy or blurred-grey: cards carry a faint rim, and floating chrome uses plain black. Depth comes from the surface ladder.

**The Glass Edge Rule.** Every glass surface gets its edge from the shared specular rim, never from a border.

## Shapes

Generously round, never sharp. The radius scale is **10 / 16 / 22 / 30px** plus pill: `xs` 10 (week
cells), `sm` 16 (tiles), `md`/`xl` 22 (the standard card and rows), `lg`/`2xl` 30 (the glance panel,
subject cards and the bottom sheet's top corners). There is no square corner and nothing below 10px.
User settings can move the standard card radius to another step of the same scale (`.radius-*`).

Anything pressable is a pill: buttons, chips, badges, inputs, the tab bar, docks, the segmented track,
room capsules. The deliberate exceptions are `--radius-squircle` (30%) for app-icon tiles, circles for
period jewels and icon buttons, and the two square hero tiles on Home at the 22px card radius.
Borders are rare; separation on card-over-card uses an inset ring (`shadow-hairline`, `inset-ring-2`
for focus and error) so a control's box never shifts between states. The one structural border is the
side rail's right hairline.

**The No-Square Rule.** If a new element needs a square corner, the element is wrong, not the rule.

## Components

Rounded, tactile, decisive. Everything is a pill or a generous radius; press is a real scale-down;
selection is a swap to the theme's inverse, never a border or underline.

### Buttons

- **Shape:** a pill; heights 36 / 44 / 54px (`sm` / `md` / `lg`); icon sizes bound to size (16 / 18 / 20px); label semibold.
- **Primary:** `.u-btn-primary` — a top-lit neutral gradient over `--bg-inverse` with `--text-on-inverse`, specular top highlight, grounded shadow. `inverse` is identical.
- **Variants:** `outline` (frosted translucent fill, hairline, top highlight), `glass` (`.u-nav-glass` pill for floating controls such as the tour's Skip/Back), `ghost` (transparent, soft tint on hover), `onBrand` (light fill, ink text), `danger` (`--status-danger` with `on-danger` text, destructive only).
- **Press:** `scale(0.97)` over 90ms on `--ease-out`; colour does not change on press. Disabled: 38% opacity, no pointer events.

### Chips and Badges

- **Chip:** 32px pill, caption bold, card fill with a hairline inset ring. **Selected:** solid inverse with on-inverse text, ring removed. Renders `<button>` when pressable and `<span>` otherwise.
- **Badge:** 22px pill, micro label; tones `brand`, `ink`, `lamp`, `success`, `warning` (caution ink on straw), `danger`, `quiet`. The exact status word (*Atcelta*, *Pārcelta*, …) is a Badge.

### Cards / Containers

- **Corner:** 22px (`--radius-xl`) default; 30px for the glance panel, subject cards and sheets.
- **Background:** `surface`, sunken, brand, and the six subject tones each with its ink, plus custom tones with computed ink.
- **Shadow:** `shadow-card` at rest (a faint rim at night); tinted tones get none. **Border:** none. **Padding:** 16px default (12px on subject cards).
- **Press:** an interactive card scales to `0.97` (`--press-scale-tile`); both press scales collapse to 1 under reduced motion.

### Subject Card

A banner card: a grainy `.u-tone-field` (88px, `md` radius) with the overlapping subject mark, the
name with code and teachers, and a stats row in Martian Mono; the whole card opens the subject sheet.
The subject on now becomes the **deep** card — the entire card is its darkened tone field with `on-deep`
text, one per screen.

### Icon Buttons

- **Shape:** circles at 36 / 44 / 48px with glyphs at 16 / 20 / 22px. **Variants:** `light` (card with hairline ring, default), `solid` (inverse), `brand` (alias of `solid`), `bare` (transparent), `glass` (translucent glass fill, `--blur-glass` 20px, inset ring).
- A label is mandatory: it is both `aria-label` and `title`.

### Inputs / Fields

- **Style:** 52px card pill, optional 18px leading icon, hairline inset ring, no border. **Focus:** a global 2px `--focus-ring` (ink in Day, off-white in Night) outline, offset 2px, on `:focus-visible`. **Error:** hairline swapped for a 2px danger inset ring, hint wired through `aria-describedby`.
- **Label:** an eyebrow above the field. **Select:** the same pill, bold body, 18px muted chevron, a native `<select>` so Android opens the OS picker.
- **Switch:** 54×32 track, 22px thumb; off is a sunken fill with a 1.5px strong-border ring, on is the **lamp** with a `lamp-ink` thumb (one of the lamp's two sanctioned uses).

### Settings screen

Settings is ordered by why a student opens it, not by how the code is organised, top to bottom:

1. **What I am looking at:** one card with the identity (class or teacher, a tap changes it) and, only when they exist, the **subgroup** and **building** filters as chips set in place — "both"/"auto" first, the chosen chip a solid inverse fill. A teacher has no subgroup chips; one building needs no switch.
2. **Status strip:** a single calm line (a status dot, "Updated 10:32", the refresh button). It grows a `caution` line with its fix **only** when alerts are blocked — the one coloured thing on the screen is always the thing to act on; offline stays muted, never red.
3. **Notifications**, 4. **Appearance** (theme thumbnails, language, subject colours, show time, weather, optional tabs), 5. **Sharing** (calendar export, the class announcement), 6. **About the app**, then one folded **More settings** row that opens in place for what is set once a term (merging lessons, where a moved lesson shows, share-card language, analytics), and the reset in a card of its own.
- A row's description is shown only where the label alone would mislead; elsewhere it is kept for assistive tech (`sr-only`) and costs no height.

### Settings group

The Settings screen is a column of **groups** (the design system's SettingsGroup): a sentence-case title in Title type (semibold, ink, no all-caps eyebrow), 12px above a 22px card that holds rows.

- **Row:** 56px minimum, 16px side padding, a muted 20px icon, the label in medium body, the current value in regular muted caption, and a 16px chevron for rows that open a sheet or a switch for rows that flip in place. A description, when a row needs one, runs full width under the label in muted caption. Rows are separated by a full-width 1px hairline, never a border.
- **Colour only as status:** an icon turns `danger` for a destructive row; nothing else tints a row. Subject tones belong to subjects.
- **Theme picker:** the theme is chosen on three thumbnails (System split half Day / half Night, Day, Night), not behind a sheet. Each thumbnail is a tiny screen drawn with the real tokens — it carries `force-light` or `force-dark`, which re-declare the theme tokens on the element itself (`colors.css` and `dark.css` scope them to `:root` / `:root.dark` **and** these classes, so no value is repeated). The chosen thumbnail gets a 2px ink ring and a check; it is a radio group that the arrow keys walk.

### Navigation

- **TabBar (phone):** one frosted `.u-nav-glass` capsule (`BottomNav`), 64px tall, inset 16px above the safe area. Inactive slots are icon-only (min 48px, 22px icon at 1.75 stroke); the selected slot grows to weight 1.9 and reveals its label beside a 2.25-stroke icon via a `0fr → 1fr` grid expansion, while a translucent `.u-nav-pill` lens glides beneath on `--ease-spring`. Schedule tabs (Home, Week, Changes with a `9+`-capped danger count) take the primary slots; personal tabs fold into a **More** slot that opens `MoreSheet` (identity row plus Subjects / Transit / Settings). A single visible personal tab is promoted straight into the bar. When the active tab lives in More, the More slot holds the lens and `aria-current`.
- **DateDock / NowDock:** the contextual slot 8px above the bar, morphing on a Framer spring. `DateDock` is a 44px `.u-nav-glass` pill with previous/next, the calendar `DatePicker`, a "Today" jump and a countdown chip back to `NowDock`; `NowDock` is a 52px capsule on the subject's deep grainy field with a live progress filament, a soft glow beneath, and the next subject scratching through.
- **StatusBar:** fixed 36px strip with sync freshness (`role="status"`) on the app ground and a 12px fade skirt that dissolves into the ambient weather sky. Nothing interactive.
- **SideNav (tablet/desktop):** a card-filled rail with a hairline right border, wordmark, Schedule and Personal groups with eyebrow headings (expanded on desktop), 22px icons.
- **Top bar:** 56px, scrolls with content, Headline title as a real `<h1>`.
- **Segmented tabs:** sunken pill track (4px padding), 36px card pill on the selected segment with `shadow-card`; a `radiogroup` with roving tabindex.

### Home

Home has two blocks, the top always about *today*, the bottom a day browser.

- **Hero tiles:** a 2-column grid of square 22px tiles. `SchoolTile` is a lamp-tinted fluid canvas that rises with `schoolDayProgress` and tilts with `devicemotion` gravity (±28°, one-time iOS permission on tap); `WeatherTile` is the temperature over an animated 2D canvas sky. Tapping either expands it across the grid (`2fr 0fr`), the school tile to an `h:mm` countdown with a damped slosh, the weather tile washing the whole screen through `WeatherAmbient`.
- **Face names its target:** the collapsed school tile reads "5+ līdz beigām" (or "līdz sākumam"), never a bare "līdz"; its accessible label carries the exact time left.
- **The live row is never under the dock:** on a phone, when a day opens, the row on now (else the next one) is scrolled clear of the fixed dock stack with `scroll-margin-bottom: var(--nav-safe)` and `scrollIntoView({block: "nearest"})`, re-checked while the weather and tiles settle and ended by the first touch, wheel or key.
- **Horizon strip (phone):** `DayHeader` collapses the "Today" and long-date rows into one compact row — a `.u-schedule-glass-chip` with time span and lesson/free facts, the browsed-day title when away from today, and a changes shortcut. Wide layouts keep `DatePicker` and chevrons.
- **Glass slabs:** consecutive lessons in one building share a `.u-schedule-glass` slab split by hairlines and joined by a 1px thread along the left period-jewel spine. Free periods (`DayGap`), building hops (`DayBuildingBridge`) and the between-lesson clock (`DayNowMarker`) split slabs. Each row is three zones: dusk-toned jewel with optional mono times, subject and quiet metadata, and a recessed `.u-schedule-room-pill` with a `StatusDot`.
- **Live row:** the active lesson lifts onto its subject's deep tone field with a 3px bottom progress filament, matching the featured SubjectCard, glance and NowDock.
- **Wide:** the glance banner and `HomeSide` (changes column) appear; tomorrow's preview shows once the day is over. Swipe/arrow paging moves the bottom block only.

### Class Selector & Subgroup Picker

Shared by onboarding (anchored by `mark.svg`) and the in-app switcher (glass Back button), over `bg-app`
with a soft top lamp wash. A `.u-schedule-glass-chip` search capsule sits above Year and Building filter
pills derived from the cached timetable; active pills are inverse. Favorites and department-grouped
`.u-schedule-glass` slabs hold a 2-column (3 on tablet/desktop) matrix of class tiles; selecting one is a
full inverse swap. A bottom-skirt `Continue · <class>` button commits or steps into the glass
`SubgroupPicker`.

### Week Calendar (2D Liquid-Glass Time Canvas)

The Week tab replaces the fixed 3-letter period matrix with a full-viewport, edge-to-edge proportional 2D-pannable liquid-glass calendar canvas (`week-calendar.tsx` + `week-calendar-event.tsx` + `week-calendar-layout.ts`) that fills 100% of the device's width and height:

- **Proportional wall-clock axis:** Every lesson block is positioned and sized by its true start/end minutes (`PX_PER_MINUTE`), so double periods, long breaks (`.u-week-break-band`), and free windows read immediately by physical height. A live `--lamp` hairline with a glowing leading orb and matching sticky-rail time pill marks the current time on Today's column (preserving the One Lamp rule).
- **Sticky dual axes & 2D pan:** A single `overflow-auto` viewport pins frosted weekday headers (`.u-week-sticky-header`, weekday + day number, Today in `bg-inverse text-on-inverse`, tappable to open that day) along the top and a Martian Mono time rail (`.u-week-sticky-rail`) along the left.
- **Zoom toggle (Detailed ↔ Full Week):** On phones and tablets, Detailed mode defaults to ~176px day columns (showing ~2.1 days simultaneously with full unabbreviated subject names, dusk-toned period jewels, `.u-schedule-room-pill` room capsules, inline time ranges, teachers/groups, building pills, and `StatusDot` cues) and auto-focuses Today; tapping the header zoom pill switches to a 5-day Full-Week overview fit. Desktop naturally displays all 5 days in full Detailed mode.
- **Live & cancelled states:** The lesson in progress lifts onto `.u-tone-field u-tone-field-deep` with a `NOW` badge and bottom progress filament; cancelled lessons stay in place at 48% opacity with strikethrough; overlapping or subgroup-paired lessons split cleanly 50/50 side-by-side.
- **Compact chrome:** Non-main building days appear as inline `.u-schedule-glass-chip` pills above the canvas, Share Week sits in `WeekTopBar`, and `WeekOverview` tucks into a collapsible liquid-glass summary bar beneath the canvas. (The DS `WeekGrid` primitive remains intact for legacy/export callers.)

### Colour Wheel & Custom Tone Controls

A 220px SVG wheel with a brightness slider writes `--subject-accent` and computes `--subject-ink` via
`readableInk()` before a tone is applied. Swatches are 26px dots in 44px hit areas; selection is a 2px
offset ring, never an inset ring; reset ("Auto") sits beside the row heading.

### Skeleton

A 200%-wide gradient moving right-to-left over 1.2s, built from surface aliases (sunken → hairline →
sunken) so it never flashes on a dark card; `aria-hidden`.

### Lesson Card — the day-list component

A two-column grid: time rail (start bold mono, end muted, a 4px tone rail) and content (period eyebrow,
optional Badge, subject at Title size, room and teacher). **Unfilled** is a card with the tone only on
the rail; **Filled** takes the tone with its ink and no shadow; **Now** adds a 2px ink inset ring (the
Home schedule uses the deep field instead); **Cancelled** is 55% opacity with a strikethrough and stays
in place (on the Home schedule it is muted ink with a strikethrough and a visible "Atcelta" word chip instead of
opacity, so the text keeps AA contrast and the change is not colour-only). Four visual states carry six domain statuses, the exact word arriving as a Badge.

### Freshness Indicator and Refresh Toast

A 30px card pill with icon and translated label (check, spinning refresh, wifi-off, triangle-alert) and
an optional tabular age; every data screen carries one. `RefreshToast` (app-level, not a DS primitive)
is a card pill that shows "Updated" for ~2.2s after a manual refresh only, polite `role="status"`,
`pointer-events-none`, never stacked.

### Bottom Sheet & Feedback Sheet

The one modal surface. 30px top corners, card fill, `shadow-raised`, entering with a 24px rise on the
spring easing over 240ms; the scrim is `--surface-overlay` over an 8px blur. The sheet is a flex column
capped at `calc(var(--app-viewport-height) - var(--app-inset-top) - 12px)` with handle, title and
footer pinned and the body scrolling — callers never add a `vh` scroller (iOS resolves `vh` against the
large viewport; `--app-viewport-height` is `100dvh` where available). In iOS standalone mode `html`,
`body` and `#root` are `position: fixed; inset: 0` to remove the black band under the bar.
`FeedbackSheet` adds segmented toggles, a counted textarea and a pill submit with send/check states.
The DS also exports a Radix `Tooltip` primitive (mounted via `TooltipProvider` in `App.tsx`) that no
screen currently uses; the bottom sheet remains the only modal.

- **LessonSheet:** Extends the Home screen's liquid-glass grammar (`.u-sheet-glass` + subject-toned
  `.u-sheet-glass-caustic`, suppressed when cancelled) into the bottom sheet: a backlit dusk-toned
  period jewel beside the subject heading, a Martian Mono `.u-schedule-glass-chip` time capsule
  paired with status/cover badges, one continuous `.u-schedule-glass` detail slab with icon-led
  rows and a recessed `.u-schedule-room-pill` for unchanged rooms, verbatim school notes in a
  matching `.u-schedule-glass` slab, and a pinned tactile Close button in the sheet footer.

### Empty State

The one centred surface: a 22px card with a squircle icon well, Title heading and at most 260px of
muted copy. Empty states stay flat: "Saturday is clear. Enjoy it." — no apology, no exclamation.

### Motion

Four durations (90 / 160 / 240 / 380ms) and one default easing `cubic-bezier(.2,.8,.2,1)`; a fade is
always paired with a small translate. The spring easing `cubic-bezier(.34,1.4,.64,1)` is used on the
sheet entrance, the TabBar lens and slot growth, and the switch thumb; the dock morph uses a Framer
spring (stiffness 460, damping 24) and the dock content unblurs in over 200ms. Nothing else bounces.
Under `prefers-reduced-motion` (and the explicit `.reduce-motion` setting) the fast/base/slow durations
collapse to 1ms, press scales become 1, and a blanket 0.01ms backstop covers anything outside the tokens.

## Do's and Don'ts

### Do:

- **Do** use semantic aliases (`bg-card`, `text-muted`, `shadow-card`, `rounded-xl`, `bg-inverse text-on-inverse`) so both themes follow without a `dark:` override.
- **Do** set every time, countdown and period boundary in `u-data` with tabular figures.
- **Do** express selection as a swap to the theme's inverse — chips, class tiles, filter pills and nav items all do this.
- **Do** keep the lamp to the lesson on now and a switch that is on, at most two per screen.
- **Do** compute contrasting text with `readableInk()` for any custom subject colour, and pair every tone with its ink.
- **Do** keep cancelled lessons in place with a strikethrough, and say so in a word on the Home schedule; never dim text by opacity below AA.
- **Do** give glass surfaces the shared specular rim and the 20px blur; keep schedule text at 4.5:1 or better over them.
- **Do** state data freshness on any screen that shows school data.
- **Do** pair every fade with a small translate.
- **Do** keep 44px as the floor for any hit target and reserve `--nav-safe` at the end of scrollable content. A control that looks smaller (the 36px `IconButton` `sm`, the 34px dock calendar toggle, the 28px dock chips) gets an invisible `before:` halo to 44px rather than growing.
- **Do** re-pull `src/ds/tokens/*.css` from the design system when a token needs to change — `dark.css` and `fonts.css` are the authored-here exceptions.

### Don't:

- **Don't** use a subject tone to mean anything; status has its own signals.
- **Don't** render a custom subject colour without verifying ink contrast via `readableInk()`.
- **Don't** use EduPage's server-supplied subject hex or stock Tailwind palette colours (`slate-500`, `amber-100`); use the aliases and tokens.
- **Don't** put a lamp fill on a button, heading or any text-styled control.
- **Don't** put a shadow under a tinted card, or a navy-tinted or grey shadow at night.
- **Don't** give anything a square corner or a radius below 10px.
- **Don't** draw a border where an inset ring will do, and don't border cards.
- **Don't** add a second modal surface; the bottom sheet is it. The one non-modal exception is the "Updated" toast.
- **Don't** add fixed chrome beyond the StatusBar and bottom stack on phones, and don't make the top bar sticky.
- **Don't** bounce anything beyond the sheet entrance, TabBar lens and slots, switch thumb and dock morph.
- **Don't** put blur on content cards or the page ground; blur belongs to glass chrome, schedule slabs, glass icon buttons and the scrim.
- **Don't** put emoji or unicode-as-icon (`★`, `✓`, `→`) in the UI; use `<Icon>` (bundled Lucide, 24px grid).
- **Don't** set uppercase above 11px Label size.
- **Don't** drift toward Material 3 components, elevation or colour roles.
