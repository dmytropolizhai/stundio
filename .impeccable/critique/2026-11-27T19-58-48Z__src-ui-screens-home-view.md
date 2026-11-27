---
target: Home day view
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 4
target_identity: "file:/home/user/stundio/src/ui/screens/home-view"
timestamp: 2026-11-27T19-58-48Z
slug: src-ui-screens-home-view
---
# Critique: Home day view (src/ui/screens/home-view)
Method: dual-agent. Score 25/40.
P0: NowDock covers and duplicates the live lesson.
P1: tile hierarchy and cryptic face ("5+ līdz", "Viss"); cancelled/changed contrast and colour-only marker; touch targets <44px (dock 292x36, toggle 34, options 36); in-app reduceMotion ignored by canvases.
P2: showTime default off, passed rows not collapsed, no off-screen canvas pause, sub-12px text, hardcoded "min", ru plural.
