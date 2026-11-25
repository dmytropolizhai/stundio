# Home View — Day Schedule Surface Brief

- **Target:** `src/ui/screens/home-view/`
- **Mode:** Operate
- **Audience & Scene:** RVT students and teachers checking their schedule one-handed on a phone in a corridor, on a bus, or outside a classroom, often offline and with ~2 seconds to spare.

## Direction contract

THESIS: Make the Day schedule on Home a continuous, refractive liquid-glass instrument that brings lessons high into the first viewport on phones instead of burying them beneath four rows of duplicated date and summary chrome.

OWN-WORLD: Stundio Night/Day (`#0d1117` Night slate, `#ebeaee` Day paper, Onest + Martian Mono, dusk subject tones, single warm `--lamp` amber) expressed as multi-pane frosted glass slabs sharing the `1px` directional specular rim (`mask-composite: exclude`) and blur saturation of `BottomNav` and `DateDock`, refracting `WeatherAmbient` when expanded.

STORY: The top tiles answer day countdown and Riga weather; `NowDock` holds the immediate lesson in the thumb zone; directly beneath the tiles, a single horizon strip and continuous glass slabs let the eye read past, live, free-period, building-hop, and upcoming lessons—with rooms aligned in a scannable right-edge column—in under two seconds.

FIRST VIEWPORT: Below `StatusBar`, `HomeTopBar`, and the two square hero tiles (`SchoolTile`, `WeatherTile`), phones collapse redundant `"Today"` title/date rows into one compact horizon strip (time span, lesson/free counts, browsed-day pill when away from today, and changes chip), bringing 3–4 liquid-glass lesson rows immediately into view above `NowDock` and `TabBar`.

FORM: Extended established surface — Liquid-glass schedule slabs (user-locked option 2, collapsed phone header chrome option 1; local surface extension, no `concept-seed` roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
