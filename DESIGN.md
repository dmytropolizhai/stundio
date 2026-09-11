---
name: Stundio
description: A confident, offline-first timetable companion built on the Studio Design System — electric blue, generously rounded, colour-indexed by subject.
colors:
  studio-electric: "#1e3aff"
  electric-strong: "#1730d6"
  electric-deep: "#060b3d"
  electric-tint: "#edf0ff"
  focus-ring: "#4a5cff"
  app-ground: "#f6f7fa"
  surface-card: "#ffffff"
  surface-sunken: "#edeff4"
  surface-inverse: "#0b0c10"
  surface-overlay: "rgba(11, 12, 16, 0.56)"
  surface-glass: "rgba(255, 255, 255, 0.14)"
  text-strong: "#0b0c10"
  text-body: "#2a2d36"
  text-muted: "#5b6070"
  border-hairline: "#dde1ea"
  border-strong: "#b9bfce"
  status-success: "#0b8a4e"
  status-warning: "#ffb552"
  status-danger: "#d92020"
  status-offline: "#5b6070"
  accent-amber: "#ffb552"
  accent-amber-ink: "#5a3703"
  accent-sky: "#9cc8f7"
  accent-sky-ink: "#0c3560"
  accent-lilac: "#b79cff"
  accent-lilac-ink: "#2c1470"
  accent-pink: "#ffa3e0"
  accent-pink-ink: "#611349"
  accent-mint: "#9fe3c0"
  accent-mint-ink: "#0b4a32"
  accent-lime: "#d7f53c"
  accent-lime-ink: "#2e3a00"
typography:
  wordmark:
    fontFamily: "Moho Condensed, Archivo Narrow, Arial Narrow, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "0.005em"
  hero:
    fontFamily: "Manrope, system-ui, -apple-system, sans-serif"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Manrope, system-ui, -apple-system, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  display-2:
    fontFamily: "Manrope, system-ui, -apple-system, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope, system-ui, -apple-system, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body-lg:
    fontFamily: "Manrope, system-ui, -apple-system, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "normal"
  body:
    fontFamily: "Manrope, system-ui, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  caption:
    fontFamily: "Manrope, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Manrope, system-ui, -apple-system, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
    fontFeature: "tabular-nums"
rounded:
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "24px"
  xl: "28px"
  2xl: "36px"
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
  nav-height: "64px"
  tap-min: "44px"
  screen-max: "420px"
components:
  button-primary:
    backgroundColor: "{colors.studio-electric}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.electric-strong}"
    textColor: "#ffffff"
  button-inverse:
    backgroundColor: "{colors.surface-inverse}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.text-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.electric-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.xl}"
    padding: "16px"
  card-tinted:
    backgroundColor: "{colors.accent-sky}"
    textColor: "{colors.accent-sky-ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  lesson-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-strong}"
    typography: "{typography.title}"
    rounded: "{rounded.xl}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-body}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "32px"
  chip-selected:
    backgroundColor: "{colors.surface-inverse}"
    textColor: "#ffffff"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "32px"
  badge:
    backgroundColor: "{colors.studio-electric}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 9px"
    height: "22px"
  text-field:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "52px"
  select-field:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "52px"
  icon-button:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.pill}"
    size: "44px"
  icon-button-glass:
    backgroundColor: "{colors.surface-glass}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    size: "44px"
  day-tile:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.lg}"
    height: "74px"
    width: "46px"
  day-tile-active:
    backgroundColor: "{colors.studio-electric}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    height: "74px"
    width: "46px"
  segmented-track:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-item-active:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-strong}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "36px"
  switch-track:
    backgroundColor: "#dde1ea"
    rounded: "{rounded.pill}"
    height: "30px"
    width: "50px"
  switch-track-on:
    backgroundColor: "{colors.studio-electric}"
    rounded: "{rounded.pill}"
    height: "30px"
    width: "50px"
  week-grid-cell:
    backgroundColor: "{colors.accent-sky}"
    textColor: "{colors.surface-inverse}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
    height: "40px"
  week-grid-cell-empty:
    backgroundColor: "{colors.surface-sunken}"
    rounded: "{rounded.sm}"
    height: "40px"
  bottom-nav:
    backgroundColor: "{colors.surface-inverse}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "6px"
    height: "64px"
  bottom-nav-item-active:
    backgroundColor: "#ffffff"
    textColor: "{colors.surface-inverse}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "52px"
  bottom-sheet:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.2xl}"
    padding: "10px 20px 24px"
  sync-status:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "30px"
  empty-state:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.xl}"
    padding: "36px 24px"
---

# Design System: Stundio

## Overview

**Creative North Star: "The Confident Companion"**

Stundio is a pocket-sized assistant with a strong voice. It does not present the school's timetable
apologetically or neutrally — it takes a position on what matters right now, sets it large, and gets
out of the way. Electric blue, black pills, and display type at 40px on a 420px-wide phone are not
restraint; they are the sound of an app that is certain about the answer it is giving. The
personality comes entirely from decisiveness, never from ornament: there is no illustration, no
gradient mesh, no texture, no mascot. What reads as character is scale, roundness, and the
willingness to commit to a single accent.

The system is dense with information but generous with form. Cards are 28px-rounded and unbordered;
everything interactive is a pill; the six subject accents are pastel fills carrying dark ink pairs
so a colour-coded card is still full-contrast text. The ground is a cool near-white (#f6f7fa) that
never appears as pure white — white is reserved for cards, so a surface reading as white is always
*a thing*, not the page. Dark mode is a first-class user setting, not a media query: only the
semantic aliases re-point under `.dark`, never a base palette step.

It is built for one hand in a corridor. Every measurement in the system assumes a 420px design width,
a 44px minimum hit target, and a reader who has about two seconds. Confirmed anti-references:
**EduPage's own UI** (dense grey tables, server-supplied subject colours with no contrast guarantee,
information buried behind taps), **Material 3 and stock Android** (the Studio DS has its own form
language and does not drift toward Material components, elevation, or colour roles), and **generic
dashboard SaaS** (slate-and-indigo Tailwind defaults, hairline-bordered rectangles, desktop
data-table density).

**Key Characteristics:**

- Electric blue as a single, sparing voice against cool neutral paper.
- Nothing is square: 28px cards, pill controls, 8px as the smallest radius in the system.
- Selection is a fill swap to solid black — never a border, underline, or indicator line.
- Six pastel subject accents used strictly as an index, each with a dark ink pair.
- Times and countdowns set in tabular mono so digits never jitter.
- Structural elevation: soft, blue-tinted, and ranked.
- Dark mode is a setting, and it re-points aliases only.

## Colors

A cool, blue-leaning system: one electric accent, a neutral family that never goes warm, six pastel
subject indices, and four reserved status colours.

### Primary

- **Studio Electric** (`#1e3aff`): the single accent. It fills the primary button, the "now" ring on
  the current lesson, the active day tile, and the brand-tint icon wells — and almost nothing else.
  Its `-strong` step (`#1730d6`) is the hover/link state; `-deep` (`#060b3d`) is the navy that tints
  every shadow in the system; `-tint` (`#edf0ff`) is the pale wash behind ghost buttons and icon
  wells.

### Neutral

- **Cool Paper** (`#f6f7fa`): the app ground. Never pure white, so that a white surface always reads
  as a card.
- **Card White** (`#ffffff`): every card, chip, input, and floating pill.
- **Sunken** (`#edeff4`): recessed tracks — the segmented-tab rail, quiet badges, skeleton base.
- **Near-Black Ink** (`#0b0c10`): headings, and the fill of the floating nav and every selected chip.
- **Reading Ink** (`#2a2d36`): body text.
- **Muted Ink** (`#5b6070`): secondary metadata — room, teacher, timestamps, eyebrows.
- **Hairline** (`#dde1ea`) and **Strong Border** (`#b9bfce`): separation where a shadow would be too
  loud, applied as inset rings rather than borders.

### Tertiary — the subject index

Six pastel accents, each shipped with a dark ink pair: **Amber** (`#ffb552` / `#5a3703`), **Sky**
(`#9cc8f7` / `#0c3560`), **Lilac** (`#b79cff` / `#2c1470`), **Pink** (`#ffa3e0` / `#611349`),
**Mint** (`#9fe3c0` / `#0b4a32`), **Lime** (`#d7f53c` / `#2e3a00`). A subject is assigned one by
hashing its code, so the same subject is the same colour on every screen and every device.

### Status

- **Success** (`#0b8a4e`), **Warning** (`#ffb552`), **Danger** (`#d92020`), **Offline** (`#5b6070`).
  These four mean sync state and lesson state and nothing else. Warning carries the amber *ink*
  pair, not white, because the amber is too light to hold white text at 4.5:1.

### Named Rules

**The Index Rule.** The six subject accents are an index, not decoration. They exist to make a
subject recognisable at a glance and to stay bound to it. They carry no meaning, no ranking,
and no mood — using an accent to signal importance, urgency, or status is a misuse. Status has its
own four colours; use those.

The guarantee is **uniqueness within a class, stability within a class** — not global uniqueness.
Tones are dealt from a class's own subject list in a stable sorted order, so no two subjects in one
timetable ever share an accent, and a subject keeps its colour across every screen and every device
for that class. Past the sixth subject the assignment falls back to a hash of the subject code and
collisions become possible again. Two different classes may colour the same subject differently;
that is accepted, because no student sees two classes at once.

**The One Voice Rule.** Studio Electric appears on at most one or two elements per screen. Its
rarity is what makes the "now" ring read as *now*. A screen with three blue things has no primary
action.

**The Alias-Only Rule.** Dark mode re-points semantic aliases (`--bg-app`, `--surface-card`,
`--text-muted`, …) and never a base palette step (`--blue-*`, `--ink-*`, `--accent-*`). A component
that reaches for a base step directly will be wrong in one of the two themes.

**The Server-Colour Rule.** EduPage ships its own per-subject hex. It is never used. It carries no
contrast guarantee, and it breaks the promise that a subject looks the same on every device.

## Typography

**Display Font:** Manrope (with `system-ui`, `-apple-system`, sans-serif)
**Body Font:** Manrope (same family — the hierarchy is carried by weight, size, and tracking, not by
a second face)
**Data Font:** JetBrains Mono (with `ui-monospace`, `SFMono-Regular`, monospace)
**Wordmark:** Moho Condensed Black — licensed, shipped with the app, and used for exactly one string:
the `studio.` wordmark. It renders nowhere else.

All faces are self-hosted and bundled: the app runs in a Capacitor WebView with no guaranteed
network, and the `latin-ext` subset is load-bearing because subject names arrive in Latvian
(*Programmēšana*, *Angļu valoda*) and the diacritics must not fall back.

**Character:** One geometric humanist sans, set heavy and tight at the top of the scale and calm in
the middle of it. Display sizes run at weight 800 with −0.025em to −0.035em tracking and line-heights
below 1 — the headline is a block, not a line of text. Body sizes sit at weight 500, which reads as
"confident default" rather than the apologetic 400 most apps use.

### Hierarchy

- **Hero** (800, 56px, 0.95, −0.035em): the one-per-screen statement. Used sparingly.
- **Display 1** (800, 40px, 1.0, −0.025em): screen titles (`h1`).
- **Display 2** (700, 30px, 1.05, −0.025em): section headings (`h2`).
- **Title** (700, 22px, 1.15, −0.025em): the subject name on a lesson card, card headings (`h3`).
- **Body Large** (500, 17px, 1.45): the lead paragraph and sheet body.
- **Body** (500, 15px, 1.5): default UI text.
- **Caption** (500, 13px, 1.4): room, teacher, hints, chip labels.
- **Label / Micro** (700, 11px, 1.2, 0.14em, uppercase): eyebrows, period numbers, badge text.
- **Data** (JetBrains Mono, 500, 15px, 1.3, 0.01em, `tabular-nums`): every time, countdown, and
  period boundary.

### Named Rules

**The Tabular Time Rule.** Anything that is a time, a countdown, or a number that ticks is set in
JetBrains Mono with `font-variant-numeric: tabular-nums` (the `u-data` utility). A clock that
reflows as its digits change is a broken clock.

**The Tight Display Rule.** Display type is always set BIG and tight — never above 1.05 line-height,
never with positive tracking. If a heading needs to be small to fit, it is a Title, not a shrunken
Display.

**The Eyebrow Rule.** Uppercase appears only at Label size with 0.14em tracking (the `u-eyebrow`
utility). Uppercase at body size or larger does not exist in this system.

## Layout

A single-column phone stack, capped at a 420px design width (`--screen-max`) and centred on anything
wider. Side padding is a constant 20px gutter (`--gutter-screen`); stacked cards sit 12px apart
(`--gap-card`); screen sections are separated by 28px (`--gap-section`). The spacing base is 4px, but
the product deliberately leans on the larger steps — 16, 20, 24, 28 — which is where the "generous"
feel comes from.

Chrome is asymmetric on purpose. The **top bar** (56px min-height) is *not* sticky: it scrolls away
with the content so the day strip stays adjacent to the lesson list it controls. The **bottom nav**
is the only fixed element — a floating 64px pill inset 16px from the screen edges, sitting above
`env(safe-area-inset-bottom)`. Content that could slide under it reserves that height plus the inset.

Two horizontal scrollers exist — the day strip and the class list — and both hide their scrollbar
(`no-scrollbar`); on a phone the bar is pure noise. Safe-area insets are read at the root as
`--app-inset-top` / `--app-inset-bottom`, because the app runs full-bleed edge-to-edge inside the
WebView. There are no desktop breakpoints: this is a phone design that centres, not a responsive
grid that reflows.

**The One Fixed Thing Rule.** Exactly one element is fixed to the viewport: the bottom nav.
Everything else scrolls, including the header.

## Elevation & Depth

Depth is **structural layering**: shadow depth encodes rank, and reading the shadow tells you where
something sits in the stack. The vocabulary is deliberately small, soft, and blue-tinted — every
shadow is built from the deep navy `#060b3d` at low alpha with a large negative spread, never a grey
or black drop shadow. The result is diffuse and low-contrast: surfaces look lit rather than cut out.

The stack, bottom to top: flat ground → sunken track → card → raised (bottom sheet) → nav.

### Shadow Vocabulary

- **Card** (`0 2px 6px rgba(6,11,61,.05), 0 12px 28px -12px rgba(6,11,61,.12)`): the resting state of
  every white card, chip, input, and pill.
- **Raised** (`0 4px 10px rgba(6,11,61,.06), 0 24px 48px -20px rgba(6,11,61,.2)`): the bottom sheet —
  the only thing that sits above content.
- **Nav** (`0 8px 24px rgba(6,11,61,.24)`): the floating black nav pill, the top of the stack.
- **Brand** (`0 12px 32px -12px rgba(30,58,255,.55)`): the coloured glow under the primary button
  only. It is the button's identity, not an elevation step.
- **Inset Hairline** (`inset 0 0 0 1px var(--border-hairline)`): the one inner shadow the system
  allows, standing in for a border on white-on-white controls.

### Named Rules

**The Tinted-Card Rule.** A card filled with a subject accent gets **no shadow**. Its colour already
separates it from the page, and stacking a navy shadow under a pastel fill muddies the tint.

**The Blue-Shadow Rule.** Shadows are navy-tinted, never grey or black — in light mode. In dark mode
a navy shadow is invisible, so the system drops to plain black shadows for floating chrome and
otherwise conveys depth through surface contrast (`#0b0c10` ground → `#16181f` card).

**The Two Blurs Rule.** Backdrop blur exists in exactly two places: glass chrome over the blue hero
(18px) and the modal scrim (8px). Blur over a white surface does not exist.

## Shapes

Generously round, never sharp. The radius scale runs 8 / 12 / 18 / 24 / 28 / 36 / pill, with **28px
(`--radius-xl`) as the standard card** and 36px reserved for the hero card and the bottom sheet's top
corners. 8px is the *smallest* radius in the system — there is no 4px, and there is no 0.

Anything that can be pressed is a pill: buttons, chips, badges, inputs, the nav, the segmented track,
the active nav item, the freshness indicator. The one deliberate exception is `--radius-squircle`
(30%), used for app-icon-style tiles like the empty-state icon well.

Borders are rare. Where separation is needed on white-over-white, the system uses an **inset ring**
(`shadow-hairline`, or `inset-ring-2` for focus and error) rather than a border, so the control's box
size never shifts between states.

**The No-Square Rule.** Nothing in this system has a square corner. If a new element needs one, the
element is wrong, not the rule.

## Components

Rounded, tactile, decisive. Everything is a pill or a generous radius; press is a real scale-down;
selection is a full fill swap to solid black, never a border or an underline. The system commits
rather than hints.

### Buttons

- **Shape:** always a pill (`999px`). Three heights: 36 / 44 / 54px (`sm` / `md` / `lg`).
- **Primary:** Studio Electric fill, white text, and the brand glow beneath it
  (`0 12px 32px -12px rgba(30,58,255,.55)`).
- **Variants:** `inverse` (near-black fill, white text), `outline` (transparent with a 2px inset
  ring), `ghost` (transparent, electric-strong text, brand-tint on hover), `onBrand` (white fill on
  the blue hero).
- **Press:** transform only — `scale(0.97)` over 90ms on `--ease-out`. Colour does not change on
  press. Hover tints exist for desktop previews but the device has no hover.
- **Disabled:** 38% opacity, pointer events off.
- **Icon sizes are bound to the button size:** 16 / 18 / 20px. Never a free choice.

### Chips

- **Style:** 32px pill, caption-size bold text, white fill with a hairline inset ring.
- **Selected:** a full override to a solid near-black fill with white text — the ring is removed, not
  layered on. `aria-pressed` carries the state.
- **Behaviour:** renders as a `<button>` when it does something and a `<span>` when it doesn't, so a
  decorative chip never lands in the tab order.

### Cards / Containers

- **Corner style:** 28px (`--radius-xl`) by default; 36px for hero and sheet.
- **Background:** white on the cool paper ground; ten tones available (surface, sunken, brand, ink,
  and the six subject accents, each with its ink pair).
- **Shadow strategy:** `shadow-card` at rest; tinted tones get none (see The Tinted-Card Rule).
- **Border:** none. Ever.
- **Internal padding:** 16px default.
- **Press:** a card that has an `onClick` scales to `0.94` — tiles press deeper than buttons do.

### Icon Buttons

- **Shape:** a circle — `size-9` / `size-11` / `size-13` (36 / 44 / 48px) at the pill radius, with
  the glyph bound to the size (16 / 20 / 22px).
- **Variants:** `light` (white with a hairline inset ring — the default), `solid` (near-black),
  `brand` (electric with the brand glow), `bare` (transparent, tinting to sunken on hover), and
  `glass`.
- **Glass is conditional.** The `glass` variant — 14% white over an 18px backdrop blur with a
  28%-white inset ring — is legal **only over the blue hero**. Never over white, never as a frosted
  card on the app ground (see The Two Blurs Rule).
- **A label is mandatory.** An icon-only control has no accessible name without one; the label
  serves as both `aria-label` and `title`.

### Inputs / Fields

- **Style:** 52px white pill, optional leading icon at 18px, hairline inset ring, no border.
- **Focus:** a 2px `--focus-ring` outline offset 2px, applied globally via `:focus-visible`.
- **Error:** the hairline is swapped for a 2px danger inset ring; the hint doubles as the error
  message and is wired through `aria-describedby`.
- **Label:** an uppercase eyebrow above the field, never a floating or inline placeholder-label.
- **Select** shares the same 52px pill, set in **bold** body with an 18px muted chevron at the
  trailing edge. It is a native `<select>` with `appearance: none`, not a custom listbox: on Android
  the native element opens the OS picker, which is the correct control on a touch device and keeps
  working while JS is busy.
- **Switch:** a 50×30 track with a 24px white thumb travelling 20px, electric when on and hairline
  when off (darkened under `.dark`, since the DS off-track is a fixed light step that would glow).
  The thumb travel is the *third* sanctioned spring, alongside the sheet and the nav pill.

### Navigation

- **Bottom nav:** a floating near-black pill, 64px tall, inset 16px from the screen edges, above the
  safe-area inset. Inactive items are icon-only at 62% white and share the remaining width equally.
- **Active state:** a **fill swap, not an indicator** — the active tab becomes a white pill that
  *grows* to include its text label while the others shrink. This growth is one of the places the
  spring easing is permitted.
- **Top bar:** 56px, scrolls with content, optional uppercase eyebrow above a Display-2 title, with
  `app` and `brand` (on-blue) tones. The title is a real `<h1>`, not styled text — a screen with no
  heading has an empty heading list.
- **Segmented tabs:** a sunken pill track (4px padding) with a 36px white pill on the selected
  segment, carrying `shadow-card` so the selection lifts out of its groove; unselected labels are
  muted bold. Exposed as a **`radiogroup` with roving tabindex**, not a tablist — the segments pick a
  value (theme, language, building) rather than swapping a panel, and arrow keys move between them.

### Day Strip

The horizontal week pager above the day list. Each day is a 74×46px tile at the 24px radius,
stacking three things: an uppercase micro weekday (from `Intl`, never a hardcoded table), the day of
month at 22px display-black, and a 5px dot.

- **Selected:** a fill swap to electric with white text and the brand glow — the day strip is the
  one place the brand shadow appears outside the primary button.
- **Unselected:** white with a hairline inset ring.
- **The dot is the only change signal.** It marks a day with something worth noticing (a
  cancellation, a substitution) and is brand-coloured on an unselected tile, white on the selected
  one. When there is nothing to flag it stays in the layout as transparent, so tiles never reflow.
- Scrolls horizontally with the scrollbar hidden; press is the standard `0.97`.

### Week Grid

The whole week at a glance: a `36px + n` column grid with 6px gutters, mono period start-times down
the left edge, and one 40px cell per lesson at the 12px radius.

- **Cells** carry the subject's accent as a full fill with the short subject code in bold caption —
  **the only place in the system where abbreviation is allowed.** The unabbreviated name rides along
  for assistive tech so a three-letter code is never the only thing announced.
- **Cells keep their dark ink in both themes.** The accent fills are light pastels in dark mode too,
  so near-black text stays the correct pairing.
- **Empty cells** are sunken blocks — a non-text grey, never a place for a string like "—" or
  "free".
- **Cancelled** cells are 40% opacity with a strikethrough, matching the day view.
- **Today's column header** is electric; the others are muted. Headers are inert text by default and
  become tappable shortcuts into that day only when a handler is supplied.

### Skeleton

A shimmer placeholder built as a 200%-wide linear gradient travelling right-to-left over 1.2s,
sunken → hairline → sunken, at the 12px radius. It is built from **surface aliases, not base
palette steps** — a literal `--ink-100 → --ink-200` gradient would flash bright on a dark card. It
is `aria-hidden`; loading is announced by the screen, not by the placeholder.

### Lesson Card — the signature component

The one component the whole product is built around. A two-column grid: a time rail on the left
(start time bold in tabular mono, end time smaller and muted, with a 4px pill-rounded colour rail
beside them) and the content on the right (uppercase period eyebrow, an optional status badge, the
subject at Title size, then room and teacher with 14px icons).

- **Unfilled (default):** white card, `shadow-card`, and the subject's accent appears *only* as that
  4px rail. This is the normal density for a day's list.
- **Filled:** the whole card takes the subject accent with its ink pair, and the shadow is dropped.
- **Now:** a 2px electric inset ring around the unfilled card. No fill, no glow, no animation —
  the ring alone.
- **Cancelled:** 55% opacity plus a strikethrough on the start time and the subject name. The lesson
  stays in place and stays readable; it is never removed from the list.
- The visual treatment is deliberately four states while the domain has six. The exact word
  (*Atcelta*, *Pārcelta*, *Aizvietota*, …) arrives as a `Badge`, so no domain meaning is lost to the
  visual vocabulary.

### Freshness Indicator (Sync Status)

A 30px white pill with an icon and a translated label: cloud/success when synced, a spinning
refresh in brand when syncing, wifi-off in offline grey, triangle-alert in danger when failed, with
an optional tabular "12 min ago" detail. Every data screen carries one. Saying where the data came
from and how old it is is a content rule of this system, not decoration.

### Bottom Sheet

The only modal in the system — the DS ships no Dialog, Toast, or Tooltip, and none should be added.
36px top corners, white, `shadow-raised`, entering with a 24px rise on the spring easing over 240ms;
the scrim is navy at 56% over an 8px blur, fading in over 160ms. Bottom padding reserves the safe-area
inset.

### Empty State

The only centred surface in the system; everything else is a full-width stack or a grid. A white
28px card with a squircle brand-tint icon well, a Title heading, and at most 260px of muted body
copy. **Copy rule: empty states stay flat.** "Saturday is clear. Enjoy it." — no apology, no
cheerleading, no exclamation mark.

### Motion

Four durations (90 / 160 / 240 / 380ms) and one default easing (`cubic-bezier(.2,.8,.2,1)`). A fade
is always paired with a small translate — never a fade alone. The spring easing
(`cubic-bezier(.34,1.4,.64,1)`) is permitted in exactly three places: the bottom sheet's entrance,
the nav's active pill growing, and the switch thumb's travel. Nothing else bounces. (The DS's own
comments say "two"; the switch predates that note and is the third. Three is the shipped truth.) Press is `scale(0.97)` on controls and
`scale(0.94)` on tiles, at the 90ms instant duration. Under `prefers-reduced-motion` the duration
tokens collapse to 1ms and the press scales become 1, with a blanket transition/animation backstop
for anything animating outside the tokens.

## Do's and Don'ts

### Do:

- **Do** use the semantic aliases (`bg-card`, `text-muted`, `shadow-card`, `rounded-xl`) rather than
  base palette steps, so both themes follow without a `dark:` override.
- **Do** set every time, countdown, and period boundary in the `u-data` utility with tabular figures.
- **Do** express selection as a fill swap to solid near-black — chips, day tiles, and nav items all
  do this and should keep doing it.
- **Do** give the current lesson the 2px electric inset ring and nothing more.
- **Do** keep cancelled lessons in place at 55% opacity with a strikethrough; they are information,
  not clutter.
- **Do** state data freshness on any screen that shows school data.
- **Do** pair every fade with a small translate.
- **Do** keep 44px as the floor for any hit target, and reserve the 64px nav height plus its 16px
  inset at the bottom of scrollable content.
- **Do** re-pull `src/ds/tokens/*.css` from the design system when a token needs to change —
  `dark.css` and `fonts.css` are the two authored-here exceptions and say so in place.

### Don't:

- **Don't** use a subject accent to mean anything. It is an index (see The Index Rule); status has
  its own four colours.
- **Don't** use EduPage's server-supplied subject hex, raw hex of any kind, or stock Tailwind palette
  colours (`slate-500`, `amber-100`).
- **Don't** put a shadow under a tinted card, or a navy-tinted shadow anywhere in dark mode.
- **Don't** give anything a square corner, or a radius below 8px.
- **Don't** draw a border where an inset ring will do, and don't add borders to cards at all.
- **Don't** add a second modal surface — no Dialog, no Toast, no Tooltip. The bottom sheet is it.
- **Don't** make the top bar sticky; the bottom nav is the only fixed element.
- **Don't** let anything bounce except the bottom sheet's entrance, the nav's active pill, and the
  switch thumb.
- **Don't** use blur over a white surface.
- **Don't** put emoji or unicode-as-icon (`★`, `✓`, `→`) in the UI; use `<Icon>`, which is bundled
  Lucide at 2px stroke on a 24px grid.
- **Don't** set uppercase above 11px Label size.
- **Don't** drift toward Material 3 components, Material elevation, or Material colour roles.
