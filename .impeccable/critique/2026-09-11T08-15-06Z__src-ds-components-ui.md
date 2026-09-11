---
target: components
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:D:\\projects\\parser\\src\\ds\\components\\ui"
timestamp: 2026-09-11T08-15-06Z
slug: src-ds-components-ui
---
Method: dual-agent (A: design review, source + live app at 375px · B: detector + browser evidence, isolated)

# Design Critique: the component layer (`src/ds/components/ui` + `src/ui/components`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Freshness pill on every data screen is exemplary — but the most important status, "where am I in the day," is a hairline rule, and sync/loading are announced to no one (`Skeleton` is `aria-hidden`, `SyncStatus` has no `role="status"`) |
| 2 | Match System / Real World | 3 | Latvian chrome, `1. stunda`, school prose preserved verbatim — then `subjectCode()` invents `VKI`/`AD`/`SCD`, a vocabulary that exists nowhere in the school |
| 3 | User Control and Freedom | 3 | Arrows, jump-to-today, scrim/Esc/button dismissal all present; no horizontal swipe between days, the expected gesture for exactly this UI |
| 4 | Consistency and Standards | 3 | DS discipline is real, but `day-strip.tsx` uses `role="tablist"`/`role="tab"` with no tabpanel — the precise mistake `segmented-tabs.tsx:20-26` rejects by name |
| 5 | Error Prevention | 3 | Nothing destructive exists; the `day.stale` banner prevents the app's worst possible lie |
| 6 | Recognition Rather Than Recall | 2 | Invented acronyms with no on-screen legend, and with 6 accents over 8 subjects the colour index collides |
| 7 | Flexibility and Efficiency | 3 | Favourites, jump-to-today, week-cell tap-through are genuine accelerators; no swipe, no glance shortcut |
| 8 | Aesthetic and Minimalist Design | 4 | Genuinely excellent and genuinely restrained. One accent, tabular time, no ornament, the willingness to set a subject at 22px/800 and stop |
| 9 | Error Recovery | 2 | `Neizdevās atjaunināt` + `Atjaunināt` is the entire story — no cause, no "no signal" vs "server refused", and the affordance is a text button inside a 30px pill |
| 10 | Help and Documentation | 1 | None. No legend for the grid codes, no explanation of the day-strip dot or `Automātiski`. `SubjectsView` is the missing legend and nothing links to it |
| **Total** | | **27/40** | **Competent system, under-served composition** |

## Design Specificity Verdict

**LLM assessment.** A product-shaped component set sitting on top of a product-blind composition.

The DS layer passes the swap test more often than not. `lesson-card.tsx` could not be lifted into another app without gutting it — the time-rail grid, the deliberate four-treatment/six-status split at `lesson-card.tsx:9-16`, the `cancelled` treatment that dims and strikes without removing, and the comment explaining that the exact word travels through the `badge` slot so no domain meaning is lost. `sync-status.tsx`, `week-grid.tsx`'s assistive `name` field, `icon.tsx` bundling Lucide because the WebView has no guaranteed network, `select-field.tsx` staying native because that opens the Android OS picker — decisions with a school corridor in them.

The interchangeable half is the chrome, which is expected of a vendored DS. But two components are interchangeable in a way that costs this product: `day-strip.tsx` and `week-grid.tsx` were specified for `MON` and shipped into a language where the weekday is `CETURTD.` and the time gutter is 36px wide.

The deepest specificity failure is a component that does not exist. Verified: `glanceLesson()` at `src/lib/schedule/nextLesson.ts:120` — documented in-file as "the widget's one-liner" and fully tested — appears nowhere outside its own definition and the barrel re-export. The three countdown strings at `src/ui/i18n/lv.ts:68-70` have zero `.tsx` usages. `DayView` computes `minutesUntilNext` and spends it on an `aria-hidden` 4px bar. The product's stated single job is computed on every render and never rendered.

**Deterministic scan.** `impeccable detect --json` exited 0 on both directories — 2 advisory findings, 0 in `src/ui/components`:

| Rule | Count | Location |
|---|---|---|
| `design-system-font-size` | 2 | `src/ds/components/ui/button.tsx:33` (`text-[16px]`), `src/ds/components/ui/lesson-card.tsx:114` (`text-[12px]`) |

Both true positives — 16px sits between `body` (15) and `body-lg` (17); 12px between `caption` (13) and `label` (11). No false positives: the detector correctly resolved `bg-card`, `text-muted`, `rounded-xl`, `shadow-card` as project tokens. Arbitrary non-font values (`h-[54px]`, `px-[26px]`, `min-w-[46px]`) are unreported rather than cleared — no rule covers them here.

**Browser overlays.** Injection succeeded; the in-page detector ran on four routes. The live server was stopped, so no overlay is currently visible. Findings:

- Settings: `low-contrast 2.0:1 (need 4.5:1) — text #2a2d36 on #1e3aff` on a 120x36 button; `nested-cards` on the 30px sync pill
- Day view: `text-occlusion` — the pull-to-refresh hint "Velc, lai atjauninātu" is 71% covered by overlapping text; `skipped-heading` — h1 followed by h3
- Week view: same occlusion at 58%; same skipped heading
- Every route: `bounce-easing` and `layout-transition: padding` — both FALSE POSITIVES here; they are the DS's sanctioned spring and the bottom-nav's documented pill growth

The detector caught two things source review missed: React logs two hydration errors per day-view render for a nested `<li>` (`DayView.tsx:294` wraps `<li className="contents">` around `LessonRow`'s own `<li>`), and the substitutions endpoint is called 6 times per page load.

## Overall Impression

The parts are better than the whole. Somebody thought hard about the lesson card, the trust model around cancellations, and why each deviation from the vendored DS was worth making — the deviation comments across `bottom-sheet.tsx`, `icon.tsx`, `select-field.tsx`, `skeleton.tsx`, `segmented-tabs.tsx` are a design record most teams cannot produce. Then those parts were assembled into a scrolling list that answers a different question than the one the product exists to answer.

The biggest opportunity is not a new component. It is rendering the one already written and tested.

## What's Working

**The cancellation path, end to end.** `STATUS_TREATMENT` (`src/ui/theme/colors.ts:106-113`) makes the visual vocabulary deliberately lossy while `STATUS_TONE` plus the `badge` slot keeps all six domain statuses lexically intact, and `LessonSheet` surfaces both a structured `Bija ·` diff and the school's untranslated sentence under `No skolas`. Three files cooperate so the student never has to trust Stundio's paraphrase over the school's.

**Type discipline in service of the glance.** `u-data` tabular figures mean the clock rail never reflows; the subject at 22px/800/−0.025em is decisively loudest; room and teacher recede to 13px muted. The card's internal hierarchy is correct. The problem is entirely between cards, never inside one.

**Token legibility.** Two advisory findings across 27 component files, and a third-party detector could tell semantic utilities from ad-hoc values unaided. That is what the `@theme inline` layer bought.

## Priority Issues

### [P1] The product's single job is computed and never rendered

**Why it matters.** At 11:03 a student opening A1-1 sees three lessons that already ended. To learn IKT starts at 12:05 in room 501 they scroll past ~600px of history and do the subtraction themselves. That is reading a timetable — what EduPage already does.

**Fix.** Add a `GlanceCard` above `DayStrip` in `DayView`, today-only, driven by the existing `glanceLesson(day, now)`. Live: `Tagad · IKT · 501 · atlikušas 22 min` — subject at Title, countdown in `u-data`, 2px electric inset ring. Not live: `Nākamā · … · pēc 62 min`. Finished: `Stundas beigušās` at Display-2, not a 13px caption.

**Suggested command:** `/impeccable shape`, then `/impeccable layout`.

### [P1] Latvian breaks two DS components at the shipping viewport

**Why it matters.** `week-grid.tsx:69` hardcodes a 36px time gutter; `08:30` in 11px mono does not fit, so every start time is clipped — and that rail is the only time information on the screen. Headers have no truncation and collide. `day-strip.tsx` has an un-truncated weekday span in a `min-w-[46px]` tile; `CETURTD.` overflows at 375px. RU is longer again.

**Fix.** Widen the week gutter to 44px, add `truncate overflow-hidden` to headers; add `overflow-hidden` to the day tile and `truncate max-w-full` to its weekday span; pass day-of-month alone instead of `07.09`.

**Suggested command:** `/impeccable adapt`.

### [P1] Accessibility floor: invisible focus, invalid list markup, silent status

**Why it matters.** Verified: `src/index.css:311` defines the global focus ring inside `:where(...)` (zero specificity) and both `text-field.tsx:60` and `select-field.tsx:46` set `outline-none`, which wins. The class search field shows nothing on focus. Nested `<li>` produces two React errors per render and corrupts list semantics. Nothing announces sync state.

**Fix.** Move the ring to the pill wrapper via `has-[:focus-visible]:inset-ring-2 has-[:focus-visible]:inset-ring-focus` in both field components. Remove the outer `<li>` in `DayView`. Add `role="status"` to `SyncStatus`. Give `week-grid` real `role="grid"` semantics and put period + time into `cellLabel`.

**Suggested command:** `/impeccable audit`, then `/impeccable harden`.

### [P2] The colour index collides, and the week grid's codes are invented

**Why it matters.** `subjectTone()` hashes into six accents; A1-1 has eight subjects, so collisions are guaranteed — live, `VKI` and `LVL` are both pink. DESIGN.md's Index Rule promises "recognisable at a glance." `subjectCode()` fabricates `AD`, `SCD`, `AUD`, which the school does not publish, and `WeekView` shows only those with no legend.

**Fix.** Make tone assignment collision-aware per class: derive tones from that class's own sorted subject list, falling back to the hash past six. Add a legend row of `Chip`s below the grid using each tone as the fill; `SubjectsView` already computes the data.

**Suggested command:** `/impeccable colorize`, then `/impeccable clarify`.

### [P2] Touch targets fall below the system's own floor at the reach extremes

**Why it matters.** Verified: the prev/next day arrows are `size="sm"` (36px) against DESIGN.md's explicit 44px floor, in the top-right of an 812px screen. The retry button on a failed sync is a bare text button inside a 30px pill. Week-grid cells are 40px on one axis. Past lessons carry identical weight to future ones, which forces the scroll in the first place.

**Fix.** Promote day arrows to `size="md"` and move day navigation into the reachable bottom third, or add horizontal swipe. Give retry a real 44px target. Add a `past` variant to `lesson-card` at `opacity-60` with a desaturated rail, reusing `cancelled` mechanics.

**Suggested command:** `/impeccable adapt`, then `/impeccable polish`.

## Persona Red Flags

**Jordan (first-timer).** `ClassPicker` renders ~122 undifferentiated rows with `Galvenā ēka` repeated on nearly every one — no letter anchors, no programme grouping. Jordan knows "first year, IT," not `A1-1`. The week view shows `AD`, `VKI`, `SCD` with no legend and no help affordance anywhere. The day-strip dot — DESIGN.md's "only change signal" — is wired at `DayView.tsx:88` to `dot: d === now.date`, so it marks today, which is already the electric tile. The signal is inverted and a day with a cancellation is never flagged.

**Sam (screen reader / low vision / reduced motion).** No visible focus ring in the search field or any select. `week-grid` is a bare grid div with no `role="grid"` and no column headers, so the week is a flat run of ~30 buttons; `cellLabel` announces a subject with no period and no time. `day-strip` announces a `tablist` contract it does not implement. Loading and sync are silent. `PullToRefresh` is touch-drag only, so under TalkBack the only refresh path is Settings → Dati. `PullToRefresh`'s framer-motion props escape the reduced-motion CSS backstop.

**Casey (one hand, bad signal, walking).** All of P1. 36px arrows in the top-right. No swipe between days. The retry affordance on the most likely failure is the smallest button in the app. The pull-to-refresh hint is 71% occluded.

## Minor Observations

- Three untranslated strings in a compile-enforced i18n: `bottom-sheet.tsx:71` (`label="Close"`), `:66` (`"Details"`), `top-bar.tsx:41` (`label="Back"`). The lesson sheet has two dismiss controls in two languages.
- `LessonSheet` offers four dismissal paths; the DS specifies the X.
- `SettingsView` nests white card → sunken track → white pill for a three-value choice; `Galvenā ēka` wraps inside a `SegmentedTabs` segment at 375px, breaking `h-9`. `segmented-tabs.tsx:77` lacks `whitespace-nowrap`.
- `SubjectsView` renders `TIC · Tehnoloģiju un inovāciju centrs` as a subject with an accent and teacher slot. It is a building.
- The substitutions endpoint is POSTed 6 times per page load; timetable calls are duplicated 2x.
- The "One Voice Rule" is unenforceable by any component: a bad week shows brand glow, brand ring, brand dot and brand text simultaneously.
- `empty-state.tsx:20` defaults its icon to `coffee`.
- `sync-status.tsx:56` uses `tabular-nums` directly rather than the `u-data` utility reserved for it.
- `moho-condensed-black.otf` is absent by design (licensed, gitignored, documented), but the `@font-face` ships anyway, so every load logs an OTS parse error and the wordmark degrades to Arial Narrow.

## Questions to Consider

1. If `glanceLesson()` is the widget's one-liner and the widget is the stated value proposition, why is the app not the widget at full size?
2. Who decided the student should learn Stundio's acronyms? Is the 5-column week grid a student need, or a layout the design system happened to ship?
3. The index promises "same subject, same colour, everywhere" and delivers "two subjects, same colour, in the same class." Is a six-value index the right instrument for a set always larger than six?
4. Every measurement in DESIGN.md assumes one hand in a corridor. What else was placed where it looked balanced on a 420px comp rather than where a right thumb can reach?
