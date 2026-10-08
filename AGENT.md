# AGENT.md

Stundio — an offline-first timetable app for Rīgas Valsts tehnikums, scraping the public
EduPage timetable of `pikcrvt.edupage.org`. React 19 + Vite + TypeScript (strict), wrapped in
Capacitor for Android. **There is no backend**: the app talks to EduPage directly and stores
everything on-device.

Companion docs — read the relevant one before touching that area:

- `MODEL.md` — the reverse-engineered EduPage contract (endpoints, aSc tables, the join recipe,
  the substitution HTML grammar). **Authoritative for anything under `src/lib/edupage/`.**
- `PRODUCT.md` — who this is for and what job it must nail ("what's on now / what's next").
- `DESIGN.md` — the Studio design system spec that `src/ds/` implements.
- `PLAN.md` — phased roadmap and current status.
- `README.md` — user-facing install/build instructions.

## Commands

```bash
npm run dev          # Vite dev server (host:true — a phone on the LAN can open it)
npm test             # vitest run
npm run test:watch
npm run test:coverage
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint (type-checked rules)
npm run format       # prettier --write .
npm run build        # tsc -b && vite build
npm run android      # build + cap sync android + cap run android (needs JDK 21 + Android SDK)
```

CI runs, in order: lint → format:check → typecheck → test:coverage → build. Coverage thresholds
live in `vite.config.ts` (90% lines/functions/statements, 80% branches) and fail the run on their
own. Run `npm run lint && npm run typecheck && npm test` before calling work done.

## Architecture

Data flows one way, and each layer only knows the one below it:

```
CapacitorHttp → lib/edupage (client → normalize/substitutions → select → resolve)
              → db (IndexedDB cache)  ←→  sync (stale-while-revalidate)
              → store (Zustand)  →  ui (screens/components)  +  ds (design system)
```

- **`src/lib/edupage/`** — everything EduPage-specific: transport, parsing, and the merge of a
  timetable + a day's substitutions into a `ResolvedDay`. Pure and React-free apart from
  `http.ts`. `types.ts` is the single source of truth for the domain types.
- **`src/lib/schedule/`** — pure "what's on now / next" (`glance.ts` builds on it: the Home screen's glance banner, day outline and tomorrow preview, incl. the building-hop rule), week maths, reminder times, substitution
  diffing. React-free **on purpose**: this is the logic the planned Android widget shares.
- **`src/lib/share/`** — the shareable week card: a pure layout → display list → canvas painter,
  a self-contained QR encoder (`qr.ts`, byte mode / level M / versions 1–6, checked against a
  reference encoder's golden matrices), then the hand-off to the OS share sheet. Domain- and
  design-system-free: colours arrive as resolved CSS colour strings and strings arrive
  translated, from `ui/share/`. Only `native.ts` touches Capacitor.
- **`src/ui/share/subject.ts`** — whose week a card names, resolved through `matchPersona`: a
  student's class (+ form teacher), a teacher's own name, or the form class in the form-class
  view. Never read `settings.selectedClassId` for a share — it outlives a switch to teacher mode.
- **`src/lib/widget/`** — the payload the Android home-screen tile renders: `payload.ts` turns
  a `ResolvedDay` + `lib/schedule`'s `glanceLesson` into already-rendered strings, so the native
  side does no schedule maths at all. Only `native.ts` touches Capacitor. The store wiring
  (`src/widget/`) publishes it after every sync; `NextLessonWidget.refresh(context)` is the
  native re-render seam. The 2×1 tile's refresh button boots `WidgetSyncActivity` — an invisible
  `BridgeActivity` — and `src/widget/sync.ts` runs the app's own sync in it, publishes, then closes it
  (native work can't reach EduPage; the JS engine is the only fetcher).
- **`src/lib/persona/`** — role resolution. Student and teacher are separate at the root (a
  class + subgroup vs. a teacher + view), so the flat `Settings` fields are resolved once into a
  discriminated `Identity` (`resolveIdentity`) and branched on with the exhaustive
  `matchPersona`; `isIdentified` / `identityKey` are the gate and the memo key. Pure, settings-
  shape only. The store exposes it as `identity()`; `sync/`, `widget/` and `notifications/`
  branch through it too.
- **`src/ui/persona/`** — the UI side of the same split: `PERSONA_PROFILES` is the per-role
  strategy table (tabs, picker, icon, copy keys, feature flags), and `usePersona()` /
  `useIdentity()` / `useIsFormTeacher()` / `useIdentityLabel()` are what screens and hooks read.
  Feedback reports carry the role, plus the class for a student — never a teacher's name
  (`REPORTED` in `ui/feedback.ts`). Web Push files a device under `store.identityLabel()`: a
  class short, or for a teacher only the SHA-256 of `teacherKey(name)` — `functions/api-push`
  regroups the same substitution page by teacher and hashes the names it reads to match.
- **`src/lib/version/`**, **`src/lib/analytics/`** — GitHub release update checks; anonymous
  Plausible pings (opt-out, no cookies or persistent id).
- **`src/db/`** — the `AppCache` port (`types.ts`) with an `idb` implementation and a memory
  fallback. Callers depend on the interface, never on `idb`.
- **`src/sync/`** — orchestration only. Injects http, cache and clock, so the policy is testable
  without a network or browser. Refresh policy is spelled out in `engine.ts` and `MODEL.md §6`.
- **`src/store/`** — one vanilla Zustand store behind React context (`provider.tsx` +
  `context.ts`), wired for production in `boot.ts`. It caches and selects; it never fetches or
  parses.
- **`src/ds/`** — the Studio design system: tokens (`ds/tokens/*.css`) plus primitives. Its
  tokens are generated copies from the Claude Design project — regenerate rather than hand-edit;
  `dark.css` and `fonts.css` are documented deliberate deviations.
- **`src/ui/components/lesson-heading.ts`** — what a lesson card leads with (student: subject; teacher: group · room, subject as subtitle). The day list (`LessonRow`) and the changes list (`ChangesLessonCard`) both build on it and on the DS `LessonCard`, so a lesson looks the same in both.
- **`public/sw.js`** — the web build's service worker (never registered on Android). It
  precaches every file `vite build` emitted: the `precacheManifest` plugin in `vite.config.ts`
  fills its `BUILD_ID` / `BUILD_ASSETS` placeholders in `dist/sw.js`, so each deploy gets a new
  cache and an offline launch never needs a file the worker has not seen. Navigations are
  network-first with a 3 s cap, then the shell cached under `/` (never `/index.html` —
  Cloudflare Pages 308s it, and Safari rejects redirected responses from a worker). Keep boot
  free of lazy `import()`s, and keep `App`'s `errorFallback`: a boot that rejects must uncover
  an error, not leave the splash rippling forever.
- **`src/ui/screens/home-view/`** — the Home tab (formerly the Day view): the glance banner (now / next, or tomorrow's preview once the day is over), then straight under it the day's schedule; stale/offline notices sit above the banner, a blocked-notifications notice (`NotificationBlockedNotice`: text + "open settings" button on Android, text only in a browser) sits with the app-level prompts, building and school notes below the schedule. Its swipe/arrow paging still steps through days. The push contract (`?tab=day`, `NAVIGATE_DAY`) keeps its old wire names; the app maps them to `home`.
- **`src/ui/`** — app screens, hooks, i18n, and theme mapping. No router: five tabs plus modals,
  with the five primary tabs bundled together to guarantee instant and reliable offline navigation.
  The tab bar floats as two pills — schedule (home/week/changes) and personal (subjects/settings);
  which tab sits in which pill is `PERSONA_PROFILES[role].nav`.

## Rules

These are enforced by lint, tests, or CI — breaking one breaks the build:

- **Only `lib/edupage/http.ts`, `lib/analytics/http.ts`, `lib/share/native.ts`,
  `lib/network/native.ts`, `lib/widget/native.ts`, `lib/systembars/native.ts` and
  `lib/app/native.ts` may import `@capacitor/*`.** ESLint `no-restricted-imports` enforces this
  per-module; everything else stays platform-agnostic and testable. (`lib/version/installer.ts` is
  the one Android-only module by nature — it drives this app's own `ApkInstaller` plugin.)
- **Import a module through its barrel** (`@/ds`, `@/store`, `@/lib/edupage`, …), never from a
  sibling file across a layer boundary.
- **Never reach upward.** `lib/` knows nothing about `store/` or `ui/`; `ds/` knows nothing about
  the app's domain.
- **`@/…` is the src root** (shadcn convention), mirrored in `tsconfig.app.json` and
  `vite.config.ts`.
- **Tests never touch the network.** `src/test/setup.ts` replaces `globalThis.fetch` with a
  rejection and disables Framer Motion animations. Parser tests read the real fixtures in `data/`.
- **Cache-first, always.** The UI renders from cache synchronously; the network catches up
  underneath. Refresh happens on open, on resume, and on pull-to-refresh — never by polling.
- **The building list is open, and a day can span two of them.** Never hard-code building names:
  enumerate what EduPage publishes (`selectTimetables`). With no building pinned, a day is merged
  across every building's timetable and the address-only "pointer" rows are dropped — MODEL.md §3.
- **The timezone is always `Europe/Riga`.** Use `todayInRiga` / the `rigaClock` helpers; never
  device-local date maths.
- **Chrome is translated (LV/EN/RU/UA); school-written text is not.** Substitution `raw` strings
  render verbatim behind a "from school" label. `lv.ts` is the typed source dictionary — adding a
  key there forces the other three.
- **Never branch on `settings.persona` directly.** Resolve the role (`usePersona()` in React,
  `state.identity()` / `resolveIdentity` elsewhere) and use `matchPersona` for data-dependent
  branches or a `PERSONA_PROFILES` field for static per-role differences. A new role difference
  is a new profile field, not another ternary — that's how a leftover class id or subgroup
  stops leaking into teacher mode.
- **No PII, anywhere.** No accounts, no backend, no user identifiers in analytics.

## Releasing

Tag a release only from a commit where `package.json` `version` and `android/app/build.gradle`
(`versionName` + a `versionCode` higher than the last release) already agree — the tag builds
the APK. `v1.3-elna` was tagged one commit before the gradle bump, so its APK was still
versionCode 2 / 1.2.0 and Android "updated" 1.2 to itself. `releaseVersion.test.ts` checks the
name/`package.json` match; the `versionCode` increase is on you.

## Style

- TypeScript is maximally strict: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `erasableSyntaxOnly`, `verbatimModuleSyntax`, no unused locals/params. Write for those.
- `type` over `interface` (lint-enforced), `import type` for type-only imports (lint-enforced).
- Prettier: 100 cols, double quotes, semicolons, trailing commas. Don't hand-format.
- Relative imports carry the `.ts`/`.tsx` extension or use aliases, like "@/"
- Comments in this codebase explain **why** a decision was made, often citing `MODEL.md` or a
  real EduPage quirk. Match that: no comments restating the code.
- Every non-trivial module opens with a short block comment stating its job and its boundaries.
  Keep that convention for new modules.


## Changes
- All changes must be done in a separate branch and PR. Generate the branch name from the issue based on git naming convention (feat, fix, chore, etc.).
- All changes must be tested.
- All changes must be documented.