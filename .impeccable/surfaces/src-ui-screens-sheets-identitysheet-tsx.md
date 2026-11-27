---
version: 1
slug: "src-ui-screens-sheets-identitysheet-tsx"
primary_target: "src/ui/screens/sheets/IdentitySheet.tsx"
related_targets: ["src/index.css"]
---

# Surface Brief: IdentitySheet

- **Scope:** Bottom sheet for switching between Student (Group) and Teacher roles (`src/ui/screens/sheets/IdentitySheet.tsx`).
- **Visitor mode:** Operate.
- **Audience & job:** RVT students and teachers switching between a class timetable and a teacher timetable (or picking/changing either identity) from Settings in one thumb-driven glance.
- **Constraints:** Inherits Stundio's Night / Day liquid-glass design system (`DESIGN.md`); offline-first (all live context derived synchronously from cached timetables via `lib/persona/directory.ts`); Europe/Riga timezone via `todayInRiga()`; zero new untranslated chrome strings (reuse existing 20-language i18n keys); 44px minimum hit targets; accessible `radiogroup` with non-nested interactive controls.

## Direction contract

- **THESIS:** Replace the 4-step segmented-control detour with a simultaneous Dual-Lens Liquid-Glass Identity Deck where both saved Group and Teacher identities live side-by-side in one frosted vessel, staged with a physical spring glide and committed decisively.
- **OWN-WORLD:** Stundio Night / Day liquid-glass grammar — `.u-sheet-glass` frosted vessel with directional 1px specular rim, dynamic ambient role caustic (cool Mist/Indigo for Student, warm Lamp/Amber for Teacher), recessed `.u-sheet-slab` inactive card vs. luminous `.u-identity-card-active` staged card with a Framer Motion shared-element spring lens, inverse check orb (Brand-Is-Ink), and tabular Martian Mono schedule pulse.
- **STORY:** Open the sheet, immediately see both your saved Group and saved Teacher with today's live lesson count, time span, subgroup/form-class badges, tap to stage the other role (watching the caustic light and glass lens glide), optionally tap inline Change to pick another class/teacher, and tap Confirm to switch.
- **FIRST VIEWPORT:** Backlit 40px role jewel + tight Display-2 title + quiet subtitle in the pinned drag header; two generous 22px stacked role cards filling the sheet body with bold identity names, live context chips, and inline Change pills; pinned full-width inverse Confirm pill in the footer.
- **FORM:** Established-world surface redesign (Dual-Lens Liquid-Glass Identity Deck), confirmed with user.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
