---
target: week tab
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
target_identity: "file:D:\\projects\\parser\\.claude\\worktrees\\github-releases-version-checker-0b6e51\\src\\ui\\screens\\WeekView.tsx"
target_fingerprint: "sha256:5bf235b463d06f40d06a441edffc6d9111549fdfe731078a63d972a43775a349"
target_path: "D:\\projects\\parser\\.claude\\worktrees\\github-releases-version-checker-0b6e51\\src\\ui\\screens\\WeekView.tsx"
timestamp: 2026-09-12T11-12-28Z
slug: src-ui-screens-weekview-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Sync badge present; no explicit "showing last published week" flag on this screen when a week is uncovered |
| 2 | Match System / Real World | 4 | Native weekday/date formatting, tabular mono times, real building/room data |
| 3 | User Control and Freedom | 3 | Cell sheet closes cleanly; header-to-day jump is one-way but recoverable via the Day tab |
| 4 | Consistency and Standards | 4 | Now matches the DS's own 44px tap-target rule and truncation conventions used elsewhere (post-fix) |
| 5 | Error Prevention | 3 | Read-only grid, low error surface; nothing destructive to guard against |
| 6 | Recognition Rather Than Recall | 2 | Subject codes (VKI, IKT, AD, TIC…) require memorization; full name only surfaces after a tap |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts or bulk affordances for scanning the grid quickly |
| 8 | Aesthetic and Minimalist Design | 3 | Clean, on-brand grid; large dead space below a light week; header collision bug (fixed) hurt this pre-fix |
| 9 | Error Recovery | 3 | Nothing to recover from in normal use |
| 10 | Help and Documentation | 1 | No in-app help anywhere, by design — consistent with the rest of the app, not unique to this screen |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict

**LLM assessment**: The week grid is genuinely authored for Stundio, not a generic data-table transplant. The soft pastel subject-accent cells, tabular-mono period start times, and edge-to-edge pill bottom nav are distinctly the Studio DS voice — a generic timetable clone would reach for a bordered spreadsheet grid (EduPage's own UI, named as an anti-reference in DESIGN.md, does exactly that). The one missed opportunity: a fully empty day column (Wednesday in the sampled week) is just dead sunken blocks top to bottom, with no acknowledgment that the day is genuinely light — not wrong, but a beat the confident-companion voice could use.

**Deterministic scan**: `impeccable detect --json src/ui/screens/WeekView.tsx src/ds/components/ui/week-grid.tsx` returned a clean `[]` — no raw hex, no banned patterns, no emoji-as-icon. This class of bug (grid-item overflow, sub-floor tap targets, dark-mode token contrast) is outside a static scanner's reach; all three issues below were found by rendering the screen and measuring the DOM directly.

**Browser evidence**: I did not run the injected-overlay `detect.js` flow (no separate sub-agent orchestration ran for this critique — see banner). Instead I drove the live app directly in the Browser pane at a 375×812 mobile viewport, in both LV light and dark themes, and confirmed each finding with `getBoundingClientRect()`/`getComputedStyle()` measurements before and after the fix. That evidence is reported inline with each issue below, not as a separate overlay.

## Overall Impression

The week grid's concept and palette are right for this product — dense, colour-indexed, glanceable. But the screen shipped three concrete defects that undercut its one job ("compare days at a glance"): a real text-collision bug between Thursday and Friday's headers, tap targets on those same headers at less than half the DS's own stated floor, and empty cells that nearly vanish in dark mode. All three are now fixed. The biggest remaining opportunity is heuristic 6 — the grid's own abbreviation rule (the one place in the DS abbreviation is allowed) has a real recall cost for a first-time viewer with no legend in sight.

## What's Working

- **The subject-accent system reads instantly.** Colour-coded cells with a 3-letter code, consistent across the whole week, make cross-day comparison fast once a viewer has learned the codes — exactly the job this screen exists for.
- **Dark mode holds up structurally.** Cells keep their pastel fill and dark ink pair in both themes exactly as DESIGN.md specifies — no washed-out or unreadable subject cells in dark mode.
- **The lesson sheet on tap is a clean, well-scoped interaction** — scrim blur, bottom-sheet motion, and full lesson detail (teacher, room, building) all matched the DS spec on inspection.

## Priority Issues

**[P0] Weekday header text collided across columns** *(Fixed this session)*
- **Why it matters**: "Ceturtd." (Thursday) at 11px bold uppercase measured 61px wide against a ~54px column, and the header span had no `min-width: 0`, so the grid item's intrinsic content width overrode the column's declared `minmax(0,1fr)` track and the text bled straight into Friday's header with no visible gap — confirmed in both LV light and dark mode via direct DOM measurement (`scrollWidth: 66` vs `clientWidth: 54`, `overflow: visible`). On a screen whose entire purpose is comparing days side by side, colliding day labels actively misread as one column belonging to another.
- **Fix**: Added `min-w-0 truncate` to the day-heading class in `week-grid.tsx` so the column's own `minmax(0,1fr)` track is honoured and a label that doesn't fit ellipsizes instead of overflowing.
- **Suggested command**: n/a — resolved.

**[P1] Weekday header tap targets were 21px tall, well under the DS's own 44px floor**
- **Why it matters**: DESIGN.md states "keep 44px as the floor for any hit target" explicitly, and PRODUCT.md describes the primary user as "one hand... in the seconds between lessons... in a corridor." Measured header buttons were 21.2px tall — under half the stated floor — on exactly the control (jump-to-day) that persona needs mid-corridor.
- **Fix**: `min-h-11` (44px) on the header button, paired with `leading-11` rather than flexbox centering (flex centering silently defeats `text-overflow: ellipsis` on the anonymous text box — confirmed this the hard way: the first attempt centered with `flex items-center justify-center` and it produced symmetric clipping with no ellipsis marker instead of a trailing ellipsis).
- **Suggested command**: n/a — resolved.

**[P2] Empty week-grid cells were nearly invisible in dark mode**
- **Why it matters**: `--surface-sunken` (`#101219`) sits only 5–9 RGB levels above `--bg-app` (`#0b0c10`) in `dark.css`, so a "no lesson this period" cell — which is real structural information on this screen — reads as almost the same colour as the page itself in dark mode, undermining "the whole week at a glance" specifically for the theme roughly half of users will be in.
- **Fix**: Added `shadow-hairline` (the DS's own inset-ring convention for separating a surface from an equally-toned neighbour) to empty cells, scoped to `week-grid.tsx`. The underlying token gap in `dark.css` is broader than this screen (it also affects the skeleton loader and segmented-tab track) and was deliberately left untouched — see Minor Observations.
- **Suggested command**: `/impeccable audit` (a full contrast pass across `dark.css` aliases, beyond this one screen).

## Persona Red Flags

**Casey (Distracted Mobile User)**: This is her screen — the P1 tap-target bug above was her exact failure mode, on a control she'd use with a thumb, mid-corridor, between periods. Fixed.

**Jordan (Confused First-Timer)**: Subject codes (`VKI`, `IKT`, `AD`, `TIC`, `MAT`, `KM`…) are the *only* place in the entire DS abbreviation is sanctioned, and Jordan has no way to learn what any of them mean without tapping each one once. The full name rides along in `aria-label` for assistive tech, but a sighted first-timer gets nothing — she has to build her own mental map cell by cell.

**Sam (Accessibility-Dependent User)**: Tab order through the grid is strictly linear across every period × day cell (confirmed in the DOM: no `radiogroup`/roving-tabindex, unlike the DS's own Segmented Tabs which use exactly that pattern). Reaching period 8 on Friday means tabbing through roughly 40 preceding buttons with no way to jump by row or column.

## Minor Observations

- A light week (10 periods, like the sampled fixture) leaves the bottom third-to-half of the viewport empty below the grid. Not wrong, but worth a deliberate decision rather than default whitespace.
- Adjacent finding, not on this screen: the Settings screen's building segmented control overflows the right edge of a 375px viewport ("TIC Olaine" clipped) — the same family of shrink-target bug as the P0 above, in a different component. Flagged for awareness; not touched in this pass.
- Adjacent finding: `--surface-sunken` in `dark.css` reads low-contrast against `--bg-app` beyond just this screen (skeleton shimmer base, segmented-tab track). The Week Grid's empty cells were the most visible symptom, not the only one.

## Questions to Consider

- Should the week grid ever show *why* a day is empty (holiday, no data yet) rather than uniform blank cells indistinguishable from "just no lessons"?
- Is there room for a one-time subject-code legend (e.g., in the Subjects tab, or a first-open tooltip) without diluting the density that makes this screen fast?
