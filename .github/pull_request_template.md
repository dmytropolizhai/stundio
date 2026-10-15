<!--
Thanks for contributing to Stundio! Fill in each section so the reviewer can see
what this PR does and why without reading the whole diff first.
Delete the hint comments as you go. Read AGENT.md before opening the PR.
-->

## What does this PR do?

<!-- One or two sentences in plain words, from a user's point of view.
Example: "Adds a Transit tab where a student can open a Google Maps route to their building." -->

## Why?

<!-- The problem or request behind it. Link an issue if there is one: "Closes #123". -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] UI / design change
- [ ] Refactor (no behaviour change)
- [ ] Translations (i18n)
- [ ] Android / native
- [ ] Docs, CI, tooling

## What changed, by area

<!-- One line per area you touched, saying what changed there. Remove the rest.
The layers are described in AGENT.md → Architecture. -->

- `src/lib/…`:
- `src/db/` / `src/sync/`:
- `src/store/`:
- `src/ui/` / `src/ds/`:
- `android/`:
- Other:

## Who sees it?

- [ ] Students
- [ ] Teachers
- [ ] Everyone
- [ ] No visible change

## How to check it

<!-- Steps a reviewer can follow in `npm run dev` or on a phone, and what they should see. -->

1.
2.

## Screenshots / video

<!-- Required for any visible change: before and after, light and dark theme if relevant. -->

## New dependencies, permissions, keys or external services

<!-- List any new npm package, Android permission, API key / VITE_ variable, or third-party
site the app now calls or embeds. Write "None" if there are none.
Remember: Stundio has no backend, so any key in the app ships to every user. -->

## Known limitations / follow-ups

<!-- What this PR deliberately does not do, and anything left for later. -->

## Checklist

- [ ] `npm run lint && npm run format:check && npm run typecheck && npm test` pass locally
- [ ] New or changed code is covered by tests (coverage thresholds in `vite.config.ts` still pass)
- [ ] New text is translated in all four locales: `lv`, `en`, `ru`, `ua`
- [ ] No hard-coded building names or addresses; no direct `settings.persona` branching (see AGENT.md)
- [ ] No unused code, state or i18n keys left in the diff
- [ ] I have tried the change myself (web and/or Android)
