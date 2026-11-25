---
version: 1
slug: "src-ui-screens-class-selector-class-selector-tsx"
primary_target: "src/ui/screens/class-selector/class-selector.tsx"
related_targets:
  - "src/ui/screens/class-selector/class-list.tsx"
  - "src/ui/screens/class-selector/class-row.tsx"
  - "src/ui/screens/class-selector/class-search.tsx"
  - "src/ui/screens/class-selector/group-classes.ts"
  - "src/ui/screens/subgroup-picker/subgroup-picker.tsx"
  - "src/ui/screens/subgroup-picker/subgroup-list.tsx"
  - "src/App.tsx"
---

# Class Selector — Choose a Class Surface Brief

- **Target:** `src/ui/screens/class-selector/class-selector.tsx`
- **Related:** `class-list.tsx`, `class-row.tsx`, `class-search.tsx`, `group-classes.ts`, `subgroup-picker.tsx`, `subgroup-list.tsx`, `App.tsx`
- **Mode:** Operate
- **Audience & Scene:** RVT students choosing their class on first launch or switching classes between lessons, one-handed on a phone (with tablet/desktop parity), scanning 122+ class codes across ~28 departments, 4 years, and 2 buildings (`Galvenā ēka`, `TIC`).

## Direction contract

THESIS: Replace the legacy flat 122-row list and white `bg-card` onboarding header with a unified **Night / Day Liquid-Glass Department Matrix** that speaks the exact same optical language as `HomeView`, `OnboardingIntro`, and `OnboardingLanguage`: atmospheric `bg-app` with soft `--lamp` ambient glow, frosted-glass search + dynamic year/building filter pills, pinned Favorites glass slab, department-grouped 2-column (3-column on wide) tactile class tiles, a Select-then-Continue bottom action bar, and a matching liquid-glass `SubgroupPicker`.

OWN-WORLD: Stundio Night / Day liquid-glass design system (`bg-app`, `.u-schedule-glass`, `.u-schedule-glass-chip`, `.u-nav-glass`, `bg-inverse` / `text-on-inverse` selection swap, `u-data` tabular counts, Onest + Martian Mono, Day/Night semantic tokens, 44px+ tap targets, `<Icon>` at 2px stroke). Zero raw hexes, zero stock Tailwind palette colors, zero legacy blue hero blocks.

STORY: On open (both onboarding and in-app switcher), the student sees a calm editorial header, a frosted search pill with one-tap clear, and a horizontal strip of dynamic Year (`1`–`4`) and Building filter pills. Below, pinned Favorites sit in their own glass slab above department-indexed glass slabs (`A`, `ATK`, `AV`, `DP`, `DT`…) holding compact 2-column tiles with class code, building, and star toggle. Tapping a tile highlights it in solid inverse ink and updates the bottom Continue button (`Continue · DT3-2`); tapping Continue commits immediately or transitions into the matching liquid-glass `SubgroupPicker` for divided classes.

FIRST VIEWPORT: Top logo/back header + `Display-2` title, frosted search capsule, horizontal year/building filter pills, Pinned Favorites slab (when present) and opening department glass slabs (`A`, `ATK`, `AV`…), anchored at the bottom by a soft-faded Continue CTA.

FORM: Department-indexed liquid-glass class matrix with dynamic quick-filter pills, pinned favorites slab, and select-then-continue footer (surface scope, Operate mode, seed key `b655b0c8`).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
