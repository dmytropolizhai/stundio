---
target: the lesson day sheet
total_score: 19
max_score: 32
na_heuristics: 5,9
p0_count: 0
p1_count: 3
target_identity: "file:/home/dmtr/Projects/stundio/src/ui/screens/lesson-sheet/lesson-sheet.tsx"
target_fingerprint: "sha256:a224975dd8fcb6829b01da36c7ffd5ebf2bc564945c2f66b9bec2f90aabaedac"
target_path: /home/dmtr/Projects/stundio/src/ui/screens/lesson-sheet/lesson-sheet.tsx
timestamp: 2026-11-26T10-07-02Z
slug: src-ui-screens-lesson-sheet-lesson-sheet-tsx
---
Method: dual-agent (A: 24fd26be-00db-4102-9103-967b39011b75 · B: fe72f423-6598-459b-8624-57a33e20892f)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Clear status/cover badges and cancelled de-escalation; omits live "NOW" state, `movedTo` destination, and day/date context |
| 2 | Match System / Real World | 2 | Teacher mode leads with Subject instead of Class · Room (`lessonHeading` parity broken); teacher codes stay `x.short`; null `coverFor` renders "Cover \| Cover" |
| 3 | User Control and Freedom | 3 | Escape, Android back, scrim, top `×`, and footer Close all work; drag-to-dismiss is bound only to the 4px handle bar |
| 4 | Consistency and Standards | 2 | Uses illegal Unicode `➔` instead of `<Icon>`; drops room capsule on room changes; 36px `sm` close button with hardcoded English `"Close"`; off-ramp `text-[12px]` mono pills |
| 5 | Error Prevention | n/a | Read-only inspection surface with no inputs, mutations, or destructive actions |
| 6 | Recognition Rather Than Recall | 2 | Omits `day.date`/weekday (forcing recall from Week/Changes); keeps abbreviated teacher shorts; repeats `Period` from header jewel |
| 7 | Flexibility and Efficiency | 2 | Unreliable 4px swipe-dismiss target; no quick prev/next period stepping or tap-to-copy for raw school notes |
| 8 | Aesthetic and Minimalist Design | 3 | Cohesive 3-zone liquid-glass composition; redundant `Period` row, duplicate dismiss chrome, and triple-stacked `backdrop-filter` |
| 9 | Error Recovery | n/a | No error states occur inside this read-only sheet (network/staleness errors live on parent screens) |
| 10 | Help and Documentation | 2 | "From school" slab clearly frames untranslated notes; no expansion of teacher initials, `movedTo` target, or multi-building context |
| **Total** | | **19/32** | **Acceptable (59.4%)** |

*(Applicable max is 32 because heuristics 5 and 9 are `n/a` on this read-only surface.)*

## Design Specificity Verdict

**LLM assessment:** Grounded in Stundio visually, but only ~70% grounded functionally. Visually, the sheet authentically extends the Home screen's liquid-glass grammar (`.u-sheet-glass`, `.u-sheet-glass-caustic`, `.u-schedule-orb-halo`, `.u-schedule-glass-chip`), suppresses caustics/pills on cancelled lessons, and isolates verbatim Latvian EduPage notes under a dedicated "From school" slab. Functionally, however, it breaks several Stundio-specific commitments: Teacher Mode bypasses `lessonHeading()` (leading with Subject instead of `Class · Room`), changed rooms *drop* their `.u-schedule-room-pill` capsule at the exact moment a student needs to spot the new room, `lesson.movedTo` and `day.date` are omitted, `Building` is buried at the bottom despite RVT's two-building commute, and `lesson-field.tsx` renders a Unicode `➔` arrow in violation of the no-unicode-icon rule.

**Deterministic scan:** `impeccable detect --json src/ui/screens/lesson-sheet` exited `0` with **2 advisory findings** (0 blocking):
- `design-system-font-size` at `src/ui/screens/lesson-sheet/lesson-field.tsx:51` (`text-[12px]` inside `.u-schedule-room-pill`)
- `design-system-font-size` at `src/ui/screens/lesson-sheet/lesson-sheet.tsx:133` (`text-[12px]` inside `.u-schedule-glass-chip`)

Both are **true positives** (factually off the `DESIGN.md` / `src/ds/tokens/typography.css` ramp, which jumps from `11px` `--size-micro` to `13px` `--size-caption`), though intentional for optical parity with Martian Mono pills on the Home screen (`day-glass-lesson.tsx:204`). Assessment A did not flag `12px` separately — the detector caught this minor token drift cleanly.

**Visual overlays:** No browser automation tool is exposed in this session, so no live overlay was injected. Fallback signal used: static CLI detector + direct source inspection of `lesson-sheet.tsx`, `lesson-field.tsx`, `bottom-sheet.tsx`, `day-glass-lesson.tsx`, `src/index.css`, and `DESIGN.md`.

## Overall Impression

The liquid-glass alignment succeeds aesthetically — tapping a Home lesson feels like lifting a frosted card straight off the schedule spine. Where it falls short is **corridor utility under change**: the sheet is strongest on an ordinary, unchanged student lesson, and weakest on the exact moments a student or teacher actually taps a lesson for details (room substitution, moved lesson, teacher cover duty, or verifying a cell from Week/Changes). The single biggest opportunity is turning the sheet from a uniform key-value dump into a change-aware, ≤4-fact inspection sheet with real one-handed swipe dismissal.

## What's Working

1. **Liquid-glass continuity with Home (`lesson-sheet.tsx:65–91, 111–140`, `src/index.css:1214–1260`)**: Reusing `--row-tone`, `.u-schedule-orb-halo`, `.u-schedule-glass-chip`, and `.u-sheet-glass-caustic` ties the sheet directly to the Home schedule slab instead of feeling like a generic modal.
2. **Lossless "From school" isolation (`lesson-sheet.tsx:93–105, 212–231`)**: Deduplicating `changeNote` and `noteRefs` into a dedicated megaphone-headed slab preserves EduPage's verbatim Latvian prose without cluttering structured fields.
3. **Calm de-escalation on cancelled lessons (`lesson-sheet.tsx:68, 111, 116, 134, 189`)**: Stripping the caustic, orb halo, and room capsule while striking through title and time visually cools cancelled lessons so they cannot be mistaken for active ones.

## Priority Issues

1. **[P1] Tiny 4px drag handle, sub-44px close button, and hardcoded English `label="Close"` in `BottomSheet`**
   - **What**: `src/ds/components/ui/bottom-sheet.tsx:111–118` binds pointer drag-to-dismiss handlers exclusively to the `h-1 w-11` (4×44px) visual handle bar; line `137` renders `<IconButton icon="x" label="Close" variant="bare" size="sm" />` (36×36px) with a hardcoded English label; line `129` hardcodes `"Details"`.
   - **Why it matters**: One-handed swipe-down fails on Android in a corridor/bus because a thumb cannot reliably hit a 4px line. The 36px close target violates Stundio's 44px floor (`DESIGN.md:124`), and TalkBack/VoiceOver announces English `"Close"` in LV/RU/UA locales.
   - **Fix**: Wrap the handle in a full-width `min-h-11` (44px) hit zone (or bind drag handlers to the non-scrolling header), bump the close `IconButton` to `size="md"` (44px), and accept a localized `closeLabel` prop passed `t("lesson.close")` from `LessonSheet`.
   - **Suggested command**: `$impeccable harden`

2. **[P1] Changed rooms drop their capsule and use illegal Unicode `➔` with broken screen-reader semantics**
   - **What**: `src/ui/screens/lesson-sheet/lesson-field.tsx:40–56` skips `.u-schedule-room-pill` whenever `hasWas` is true, rendering `was ➔ value` in plain 13px text via `ARROW = "\u2794"` (`subst-status.ts:27`) with no `sr-only` context.
   - **Why it matters**: Verifying a room/teacher change is the #1 reason to open this sheet. Dropping the pill on *changed* rooms makes the new room harder to spot than an unchanged one, violates Stundio's no-unicode-icon rule (`PRODUCT.md:94`, `DESIGN.md:862`), and reads literally as `"205 heavy wide-headed rightwards arrow 312"` in screen readers.
   - **Fix**: Replace `{ARROW}` with `<Icon name="arrow-right" size={13} aria-hidden="true" />` plus `<span className="sr-only">` old/new labels. Keep `.u-schedule-room-pill` on the **new** `value` even when `hasWas` is true, and give changed rows a subtle status accent so deltas jump out in <1 second.
   - **Suggested command**: `$impeccable clarify`

3. **[P1] Teacher Mode breaks `lessonHeading` parity and renders `"Cover | Cover"` when `coverFor` is null**
   - **What**: `src/ui/screens/lesson-sheet/lesson-sheet.tsx:42, 48–52, 115–119` bypasses `lessonHeading(lesson)` (`src/ui/components/lesson-heading.ts`), leading with Subject instead of `Class · Room` and checking only `classes.length > 0` (missing `role !== undefined || isCover`). Lines `191–201` fall back to `t("teacher.cover")` for both label and value when `coverFor` is null, duplicating the header `Cover` badge (`line 143`).
   - **Why it matters**: Teachers tapping `DP3-1 · 204` on Home land on a sheet titled `Programmēšana` (jarring mental remap), and unnamed cover duties render a nonsensical `"Cover | Cover"` row.
   - **Fix**: Delegate title/subtitle resolution to `lessonHeading(lesson)` so Teacher Mode matches `DayGlassLesson` and `LessonRow`. Only render the `Cover` detail row when `teacherLesson?.coverFor` is non-null.
   - **Suggested command**: `$impeccable polish`

4. **[P2] Fact slab exceeds the 4-item working memory limit while omitting date context, full teacher names, and `movedTo`**
   - **What**: `lesson-sheet.tsx:161–210` stacks 5–6 uniform rows in `lesson-details-slab`, led by a `Period` row (`lines 165–171`) duplicating the 40px `periodJewel` (`line 88`). Meanwhile, `day?.date` is never shown, `lesson.teachers` stays abbreviated (`x.short` at `line 179`), and `lesson.movedTo` (`types.ts:170`) is ignored.
   - **Why it matters**: Opening a lesson from Week or Changes gives zero date/weekday confirmation (forcing working-memory recall). Students tapping to learn a teacher's name still see cryptic initials, and moved lessons hide their destination.
   - **Fix**: Show the `Period` row only when `lesson.original?.period` differs from `lesson.period` (bringing the slab to ≤4 rows). Add a compact weekday/date chip beside the time chip when `day` is provided, display `x.name || x.short` for teachers, and render a `Moved to` row when `lesson.movedTo` is set.
   - **Suggested command**: `$impeccable distill`

5. **[P2] Triple-nested `backdrop-filter` and low-contrast glass-on-glass in Day mode**
   - **What**: `LessonSheet` nests `.u-schedule-glass` (`blur(20px)`, `index.css:1120`) inside `.u-sheet-glass` (`blur(24px)`, `index.css:1218`) over `Dialog.Overlay` (`backdrop-blur-(--blur-scrim)` = 8px, `bottom-sheet.tsx:92`). In Day mode, `--sheet-glass-bg` (86–92% white) and `--schedule-glass-bg` (62–80% white) stack white-on-white with weak separation.
   - **Why it matters**: Mid-range Android WebViews (RVT's primary device) drop frames compositing three stacked blur passes during sheet spring-in and scroll, while Day mode gets haze instead of crisp surface separation.
   - **Fix**: Remove `backdrop-filter` from the inner detail and notes slabs inside `.u-sheet-glass`, using a lightweight recessed translucent fill + hairline inset ring so only the outer sheet shell blurs the scrim.
   - **Suggested command**: `$impeccable optimize`

## Persona Red Flags

- **Casey (Distracted Mobile User — one hand, moving bus/corridor):**
  - *4px swipe-dismiss target*: Flicking down from the top bar misses `h-1 w-11` (`bottom-sheet.tsx:113`), forcing Casey to stretch to the scrim or footer button.
  - *Changed room loses its pill*: Opens a changed lesson to verify the new room in 2 seconds; `lesson-field.tsx:40–54` strips `.u-schedule-room-pill`, burying the new room in plain 13px text.
  - *Building buried at the bottom*: On split TIC / Galvenā ēka days, `Building` is the last row (`lesson-sheet.tsx:205–209`), easily pushed below the fold by school notes.
- **Sam (Accessibility-Dependent User — TalkBack/VoiceOver, keyboard, 200% zoom):**
  - *Hardcoded English close label*: `bottom-sheet.tsx:137` announces `"Close"` regardless of app locale (LV/RU/UA).
  - *Inaccessible diff readout*: `lesson-field.tsx:42–48` relies on `line-through` + Unicode `➔`, which screen readers announce without old/new meaning.
  - *36px close target*: `IconButton size="sm"` fails the 44px touch-target floor.
  - *200% zoom squeeze*: `lesson-field.tsx:27` uses `flex items-center justify-between gap-4` with `shrink-0` on `<dt>`, squeezing long `<dd>` diffs into narrow multi-line right-aligned columns.
- **Riley (Deliberate Stress Tester — edge cases & broken promises):**
  - *`"Cover | Cover"` row*: Teacher cover duty with `coverFor === null` duplicates `"Cover"` in both badge and row (`lesson-sheet.tsx:143, 194–199`).
  - *Cover with empty `classes`*: `lesson-sheet.tsx:48` falls back to Student mode if `classes` is empty, showing Teacher/Group rows for a teacher cover duty.
  - *Null subject title*: Renders bare `"—"` as `Dialog.Title` (`lesson-sheet.tsx:114–117`) with no fallback explanation.
  - *Abrupt unmount*: Setting `lesson` to `null` unmounts immediately with no exit transition.

## Minor Observations

- **Off-ramp `12px` mono pills (detector catch):** `lesson-field.tsx:51` and `lesson-sheet.tsx:133` use `text-[12px]` (matching `day-glass-lesson.tsx:204`), which isn't on the `DESIGN.md` / `typography.css` ramp. Either formalize a `--size-mono-pill: 12px` token in `DESIGN.md` + `typography.css` or snap to `text-caption` (`13px`) / `text-micro` (`11px`).
- **Duplicate dismiss chrome:** Both the top-right `×` (`bottom-sheet.tsx:135–139`) and the full-width footer `Close` button (`lesson-sheet.tsx:151–156`) dismiss the sheet; once full-header swipe-down works, the footer button is redundant unless paired with a real action.
- **Strikethrough on single-digit `periodJewel`:** `lesson-sheet.tsx:80` strikes through `3`/`8`/`0` inside the 40px orb when cancelled; `opacity-55` alone keeps the digit legible while title and time carry the strikethrough.
- **30px `text-display-2` on long Latvian subject names:** Multi-word RVT vocational subjects wrap to 3–4 lines at 30px (`bottom-sheet.tsx:125`), pushing the detail slab below the fold on 360px Android screens.

## Questions to Consider

1. On a substituted or multi-building lesson, shouldn't the **delta** (new room, moved destination, or building change) lead at the top of the sheet instead of sitting inside a uniform key-value list?
2. Once full-header swipe-to-dismiss works reliably, does the sheet still need a pinned full-width `Close` button — or could that thumb-zone footer let students step to the previous/next period on that day?
3. Why does the detail sheet repeat the same abbreviated teacher code (`x.short`) already shown on the Home row instead of expanding to the teacher's full name (`x.name`)?
4. When opened from the Week grid or Changes tab, how is a student supposed to confirm they tapped Tuesday's lesson and not Thursday's if the sheet never displays the day or date?
