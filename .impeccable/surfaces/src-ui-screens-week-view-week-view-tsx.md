---
version: 1
slug: "src-ui-screens-week-view-week-view-tsx"
primary_target: "src/ui/screens/week-view/week-view.tsx"
related_targets: ["src/ui/screens/week-view/week-calendar.tsx","src/ui/screens/week-view/week-top-bar.tsx"]
---

# Week View — Liquid-Glass 2D Time Canvas Surface Brief

- **Target:** `src/ui/screens/week-view/`
- **Mode:** Operate
- **Audience & Scene:** RVT students and teachers planning their week or checking upcoming days on Android phones (one-handed, often offline) as well as tablets and desktop screens, wanting to read full subject names, rooms, teachers/groups, and real time-block proportions without tapping every single cell.

## Direction contract

THESIS: Replace the cramped 3-letter-code period matrix with a proportional, 2D-pannable liquid-glass calendar canvas where every lesson occupies its true wall-clock duration and displays full subject names, room capsules, teachers/groups, and status cues at a glance, with one-tap zoom between Detailed 2D pan (~2.1 days on phone) and Full-Week 5-day overview.

OWN-WORLD: Stundio Night/Day (`#0d1117` Night slate, `#ebeaee` Day paper, Onest + Martian Mono, six dusk subject tones, single warm `--lamp` amber reserved strictly for the live current-time hairline and rail pill) rendered inside a continuous `.u-schedule-glass` canvas with sticky frosted weekday headers and time rail, dusk-toned period jewels with subtle radial caustics, recessed `.u-schedule-room-pill` badges, and `.u-tone-field-deep` for the live lesson.

STORY: Opening Week View immediately centers on today and the current wall-clock time on a proportional Mon–Fri time grid; panning horizontally reveals the full week with unabbreviated subjects, rooms, and free-period gaps; tapping the zoom toggle zooms out to compare the whole week's shape; tapping any lesson opens `LessonSheet`, and tapping a weekday header jumps into that day on Home.

FIRST VIEWPORT: Below `StatusBar` and a compact `WeekTopBar` (week range, zoom toggle, Share icon button, view options menu) plus optional inline building-day pills, the frosted 2D calendar canvas fills the viewport immediately above `DateDock` / `NowDock` and `TabBar` — showing sticky Mon–Fri day headers with day numbers, sticky Martian Mono time rail, proportional lesson blocks with full titles and room capsules, long-break bands, and the live `--lamp` time line; `WeekOverview` tucks cleanly into a collapsible summary bar beneath the canvas.

FORM: Whole surface inside an established world — Liquid-glass 2D proportional time canvas (user-confirmed proportional minute axis, zoomable 2D pan ↔ 5-day fit, compact top chrome with collapsible overview).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
