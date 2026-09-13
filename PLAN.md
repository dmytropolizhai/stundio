# EduPage timetable app — action plan

Status: Phases 0–3 done (scaffold, tooling, Capacitor, the full scraper + parser, the offline
cache + sync + store, and the UI). Next: Phase 4 (Android packaging + notifications), and the
widget spike is now unblocked — `src/lib/schedule/` is the logic it shares with the app.
Research artefacts: `MODEL.md`,
`src/lib/edupage/types.ts`, `reference/probe_*.py`, `data/` fixtures.
This plan takes it from research → shipped Android v1.

## Guiding constraints (fixed)

- **Mobile-first, local-first.** Everything runs on-device. No backend server in v1.
- **Capacitor + React (Vite + TS, strict).** Not RN (keep web skills + one codebase),
  not pure PWA (EduPage sends no CORS headers → scrape needs `CapacitorHttp`).
- **Telegram bot: deferred.** Not in v1 scope.
- **Value proposition = a home-screen "next lesson" widget.** Without it this is just
  another EduPage client. It is also the hardest piece (native Android) → de-risk early.
- Target school: `pikcrvt.edupage.org` (Rīgas Valsts tehnikums). Public data, class-based
  (no per-student login).

## Architecture snapshot

```
CapacitorHttp ─► client.ts ─► normalize.ts ─┐
                          └─ substitutions.ts ┤
                                              ├─► resolve.ts ─► ResolvedDay ─► Zustand ─► UI
                       idb (cache) ◄─► sync.ts ┘                                 │
                                                        widget bridge ◄──────────┘
```

Target layout (single Vite app, no monorepo — KISS for v1):

```
src/
  lib/edupage/
    types.ts          ← move contract.ts here; single source of truth
    http.ts           HttpClient interface + CapacitorHttp impl + fetch impl (tests/web)
    client.ts         fetchTimetableList / fetchRegularTimetable / fetchDaySubstitutions
    normalize.ts      raw aSc tables → Timetable (the cards→lessons→groups join)
    substitutions.ts  HTML → DaySubstitutions (locale-aware parser)
    select.ts         pick tt_num by (date, building)
    resolve.ts        Timetable + DaySubstitutions → ResolvedDay (merge)
    __tests__/        fixtures.ts reads repo-root ./data/ directly (no copies)
  db/                 idb wrapper: snapshot, substitutions, settings stores
  sync/               orchestration, stale-while-revalidate, "updated Xm ago"
  store/              Zustand: timetable, settings, sync status
  ui/
    screens/          ClassPicker · DayView · WeekView · LessonSheet · Settings
    components/  theme/  i18n/
  App.tsx
android/              Capacitor project
  app/src/main/.../widget/   Kotlin AppWidgetProvider (see Parallel track)
reference/            probe_edupage.py, probe_substitution.py — kept as test oracle
MODEL.md  PLAN.md
```

The Python probes stay in `reference/` as a **cross-check oracle**: parser tests can assert
the TS output matches the Python output for the same fixture.

---

## Phase 0 — Scaffold  (size: S)

**Goal:** runnable Vite+React+TS app on device, tooling in place, types moved in.

- [x] `npm create vite@latest` (react-ts), Node 20, strict `tsconfig` (`noUncheckedIndexedAccess` on).
- [x] Add Tailwind, Zustand, `idb`, `date-fns` (or Temporal polyfill), `framer-motion`.
- [x] Dev tooling: Vitest + `happy-dom` environment, ESLint (typescript-eslint), Prettier, `tsc --noEmit` in CI.
- [x] CI: `lint → format → typecheck → test → build` (GitHub Actions — the repo is on
      GitHub, not GitLab as this plan originally assumed).
- [x] Capacitor: `@capacitor/core @capacitor/cli @capacitor/android`, `npx cap add android`.
- [ ] Verify `npx cap run android` shows the app on a device/emulator — **blocked**: needs a JDK 21
      and the Android SDK, neither installed yet (`java` not on PATH, no `ANDROID_HOME`).
- [x] Move `contract.ts` → `src/lib/edupage/types.ts`; delete root copy; fix `MODEL.md` link.
- [x] ~~Copy `data/*` → `__tests__/fixtures/`~~ → tests read repo-root `data/` via
      `__tests__/fixtures.ts`; one copy, no drift between probe output and tests.
- [x] Move `probe_*.py` → `reference/`.

**Exit:** blank themed app launches on Android; `npm test` and CI are green.
Currently: web build + lint + typecheck + 3 fixture smoke tests green; on-device launch pending the SDK.

---

## Phase 1 — Scraper + parser in TypeScript  (size: L — core of the project)

**Goal:** pure, tested functions that turn EduPage responses into `contract.ts` shapes.
No Capacitor import inside `lib/edupage` except in `http.ts`.

- [x] `http.ts`: `type HttpClient = (req: { url; body: unknown }) => Promise<{ status: number; data: unknown }>`.
      Impls: `capacitorHttp` (`CapacitorHttp.post`, custom `User-Agent`), `fetchHttp` (Node/web, will CORS-fail on web — documented).
- [x] `client.ts`:
  - `fetchTimetableList(http, year)` → `getTTViewerData`, returns `{ ttNum, building, validFrom, validTo, label }[]` + `defaultNum`.
  - `fetchRegularTimetable(http, ttNum)` → `regularttGetData`, returns raw table map.
  - `fetchDaySubstitutions(http, date, mode='classes')` → `getSubstViewerDayDataHtml`, returns HTML string.
  - All send `{"__args":[null,<arg>],"__gsh":"00000000"}`; throw on `{ e: ... }` envelope.
- [x] `normalize.ts`: raw tables → `Timetable`. Implement the join in `MODEL.md §2`:
  weekday from `days` bitmask, class resolution via `classids` ∪ `groups[groupids].classid`,
  `periodSpan` from `durationperiods`, carry `weekMask`/`termMask`.
- [x] `substitutions.ts`: HTML → `DaySubstitutions`. Port `parse_info` grammar table from
  `MODEL.md §4` (incl. cross-day `movedFrom/ToDate`). Use `DOMParser` (device) / `happy-dom` (tests).
  **Always keep `raw`.** Unknown phrasing → `kind: "other"`, never throw.
- [x] `select.ts`: `selectTimetable(list, date, building)` — newest `validFrom ≤ date`, matching building; `stale` flag when none covers that week.
- [x] `resolve.ts`: `resolveDay(timetable, subs, classId, date)` → `ResolvedDay` per `MODEL.md §5`.
      Cancelled lessons stay visible (`status: "cancelled"`). Attach `original` for diff UI.
- [x] Tests against fixtures:
  - normalize: A1-1 known timetable snapshot (matches `data/normalized_1175.json`).
  - substitutions: 2026-09-09 → 55 items, `kind` distribution matches, 0 `other`, 5 cross-day.
  - resolve: hand-checked ResolvedDay for 1–2 classes on 2026-09-09.
  - a "parser canary" test: `kind === "other"` ratio must stay < 15%.

**Exit:** ✅ met. 97 tests / 8 files green; coverage on `lib/edupage` = 99.0% lines, 86.0%
branches, 100% functions (thresholds enforced in `vite.config.ts`, reported by CI).
The TS substitution parser is **byte-identical** to `reference/probe_substitution.py` over
all 55 rows of the 2026-09-09 fixture, and `normalize.ts` reproduces the probe's slot count
and per-class days exactly.

---

## Phase 2 — Local storage + sync  (size: M)

**Goal:** app works offline from cache; refreshes in the background without blocking render.

- [x] `db/`: `idb` schema — stores `meta` (timetable list, lastSync), `timetables` (by ttNum),
      `substitutions` (by ISO date), `settings` (selectedClassId, building, favorites, theme, lang).
- [x] `sync/`: stale-while-revalidate orchestration:
  - on app open + pull-to-refresh + `@capacitor/app` `resume`.
  - timetable list: refetch if `lastSync > 12h`.
  - regular timetable: fetch only when the selected week's `ttNum` isn't cached.
  - substitutions: **always** refetch today + next school day (this is the only intraday-volatile data).
  - expose `SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'` + `lastSyncAt`.
- [x] `store/`: Zustand `useTimetableStore` — `selectedClassId`, `building`, `favorites`,
      `resolvedDay(date)` selector (memoised), `refresh()`, `syncStatus`.
- [x] Retention: keep last ~14 days of substitutions, prune older.

**Exit:** ✅ met, and covered by tests rather than by hand: `store` tests assert a cold open
with a dead network serves the identical `ResolvedDay` from cache without a single request,
and that a failed refresh keeps the previous `lastSyncAt` so the UI still reads "updated Xm ago".
171 tests / 15 files green; 97.4% lines, 85.9% branches across `lib/edupage` + `db` + `sync` + `store`.

---

## Phase 3 — UI: the wrapper  (size: L)

**Goal:** fast, clean, glanceable. Ship the screens; animation is polish, not blocker.

- [x] **Theme/design system:** Tailwind v4 `@theme` tokens + one accent, class-based dark mode
      (`@custom-variant dark`, so "system / light / dark" is a real setting), subject colours from
      `subject.color` as a 4px rail, one status→colour table shared by all three screens
      (`src/ui/theme/`).
- [x] **i18n:** LV + EN + RU chrome in `src/ui/i18n/`; LV is the typed source dictionary, the other
      two are `Dict`-checked so a missing key fails the build. Weekday/date names come from `Intl`,
      not hand-written tables. Server text (`raw`) passes through untranslated under "no skolas".
- [x] **ClassPicker** (onboarding + settings): filtered list of all cached classes, favourites
      pinned on top, building hint per class, choice persisted through the store.
- [x] **DayView** (home, defaults to today):
  - vertical lesson list; **current lesson highlighted** with a progress bar, a live "now" marker
    that only appears on today.
  - free periods ≥ 20 min shown as gaps; cancelled struck-through and kept; substitutions badged.
  - header: weekday + date, prev/next day, "jump to today", sync badge.
  - states: skeleton, no-class, empty day, offline-no-cache, stale-week banner, school notes.
  - pull-to-refresh (hand-rolled — the browser gesture is disabled inside the WebView).
- [x] **WeekView:** Mon–Fri **grid** (periods down, days across), tap a cell → LessonSheet, tap a
      weekday header → that day. Chose a grid over the planned horizontal pager: the point of the
      screen is comparing days, which a pager hides.
- [x] **LessonSheet:** bottom sheet — full subject name, teacher(s), room, period time, group,
      building, the `original` → current diff, and EduPage's own sentence under "from school".
- [x] **Settings:** class + favourites, building override (only when >1 building is cached), theme,
      language, "refresh now" + last sync, about note.
- [x] **"Next lesson" logic** (shared with widget): `src/lib/schedule/` — pure, React-free and
      Capacitor-free so the Kotlin widget can be written against the same tests. `rigaClock` reads
      the school's wall clock whatever the device is set to; cancelled lessons are never "current".
- [x] Animation pass: Framer Motion for the sheet (drag-to-dismiss), the tab indicator, the day
      header swap and lesson-row layout; `prefers-reduced-motion` respected in CSS.
      Frame timing on a real device is still **unverified** (same SDK gap as Phase 0).

**Exit:** met in the test harness — 233 tests / 21 files green, 96.3% lines over `lib` + `db` +
`sync` + `store` + `ui`, screens exercised against the real `data/` fixtures with no network.
Still unverified on a physical device (no JDK/Android SDK here).

---

## Phase 4 — Android packaging + notifications  (size: M)

- [ ] **Customization settings** (extends the Phase 3 Settings screen): user-controlled
      appearance, stored in `db/` `settings` store like the rest of Settings, applied through
      `src/ds/` tokens/CSS variables — no new hardcoded colours.
  - [ ] **Theme:** already have system/light/dark (Phase 3); add an **accent colour picker**
        limited to the DS's defined accent set (don't invent new hexes outside `src/ds/tokens/`).
  - [ ] **Per-subject colours:** let the user override a subject's `subjectTone()`-assigned accent
        with another DS accent, and **toggle subject colour-coding off** entirely (falls back to a
        single neutral tone everywhere the accent currently renders — lesson rows, WeekView cells,
        the rail). Persisted per class (per device — this is local-first, not synced), with a
        "reset to defaults" action. Keep `subjectTone()` as the deterministic default; overrides
        are an explicit opt-in layered on top, not a replacement for the hashing scheme.
  - [ ] Settings UI: a per-subject list (subject name + colour swatch + on/off) under a new
        "Appearance" section, reusing existing Subjects-screen data for the subject list.
- [ ] App icon, adaptive icon, splash, status-bar styling, edge-to-edge.
- [ ] `@capacitor/app` resume → `refresh()`. `@capacitor/network` → offline banner.
- [x] `@capacitor/local-notifications`: after a foreground/resume sync, if today's (or
      tomorrow's) substitutions changed vs the cached snapshot → fire a local notification.
      Diffs the raw `DaySubstitutions` in `sync/engine.ts` rather than the resolved view (simpler,
      same effect); gated on the device having synced before, so a fresh install doesn't fire on
      its first sync. Also shipped alongside: a configurable "n minutes before the next lesson"
      reminder (`src/lib/schedule/reminders.ts` + `src/notifications/`) and a one-shot "new
      version available" notification reusing the existing `useUpdateCheck` release check.
- [x] **Share the week as an image**: the week view exports a card — class, form teacher
      (`classes.teacherid`, MODEL.md §2), the week's period rows with start *and* end times,
      subject accents, the buildings the week visits — and hands it to Android's share sheet with
      a line pointing at the releases page. Drawn on-device with plain canvas calls
      (`src/lib/share/`, `src/ui/share/`): no DOM-to-image dependency, no backend, works offline.
      Native side is this app's own `ImageShare` plugin, reusing the installer's `FileProvider`;
      a browser falls back to the Web Share API, then to a download.
- [ ] Background refresh: `@capacitor/background-runner` (or a WorkManager periodic task) to
      pull substitutions ~every few hours. **Document that Android throttles this** — treat
      on-open refresh as the reliable path, background as best-effort.
- [ ] No FCM / push in v1 (needs a server — folds into the deferred bot's backend later).

**Exit:** installed app refreshes on open/resume and raises a local notification when a
favorite class's day changes while the app has run.

---

## Phase 5 — Release  (size: S–M)

- [ ] Privacy policy (easy: no data leaves device; only calls `pikcrvt.edupage.org`).
- [ ] Play Console: listing, screenshots, closed testing track; invite schoolmates.
- [ ] `README` (what it is, how to build), `LICENSE`, ToS note (personal/educational use,
      custom User-Agent, cache-first, no tight polling).
- [ ] Optional: Sentry for crash reports (respecting privacy), a one-line anonymous "it opened" ping — or nothing.
- [ ] Tag `v1.0.0`.

**Exit:** installable from the Play closed track; ≥5 schoolmates using it for a week without a blocking bug.

---

## Phase 6 — e-klase grades integration  (size: M–L, fast-follow after v1, needs a decision first)

**Goal:** show grades for an EduPage subject by pulling them from e-klase's "Sekmju izraksts"
(grade transcript) report, which — unlike e-klase's own gradebook view — lists every mark
without a premium subscription.

This is a bigger step than anything else in the roadmap: it's the first per-student,
per-credential feature in an app whose whole design is anonymous and class-based (see
"Guiding constraints" above, and the "Out of scope" line below, which currently rules this
out). Don't start this phase until that trade-off is explicitly re-opened and accepted.

- [ ] **Decide the trust model first.** e-klase requires a real login (username + password),
      not an anonymous hash like EduPage's `gsechash`. Storing a schoolmate's e-klase password
      on-device is a materially different privacy posture than read-only public-timetable
      scraping — needs `@capacitor/preferences`' secure storage (or a native Keystore-backed
      plugin), a clear "this is unofficial, use at your own risk" disclosure, and probably an
      opt-in toggle that's off by default.
- [ ] Reference/probe first: a `reference/probe_eklase.py` (stdlib + `requests`, mirroring
      `probe_substitution.py`) to log in, pull "Sekmju izraksts", and confirm it isn't gated
      behind the same premium wall as the in-app gradebook. Capture a fixture under `data/`
      before writing any TS.
- [ ] New isolated module `src/lib/eklase/` (own `http.ts`/`client.ts`/parser), **not** inside
      `src/lib/edupage/` — different origin, different auth, different HTML shape. Same rules
      as `substitutions.ts` apply: parser never throws, keep `raw`, canary test on unparsed rows.
- [ ] Login/session handling: e-klase session cookies + whatever CSRF token the login form
      needs; document the flow in a new `MODEL_EKLASE.md` the way `MODEL.md` documents EduPage.
- [ ] Subject matching: EduPage subject codes vs. e-klase subject names don't share a key.
      Needs a small mapping step (manual per-class override, or fuzzy match with a confirm
      step in Settings) — surface unmatched subjects rather than silently dropping grades.
- [ ] Storage: a new `db/` store for grades, keyed by subject + date, cached like everything
      else (offline-first); credentials stored separately from cached data, cleared together
      on "log out of e-klase" / "clear data".
- [ ] UI: grades surfaced on `LessonSheet` for that subject (and/or a dedicated Grades screen),
      clearly marked as "from e-klase" the way substitutions are marked "from school".
- [ ] Retention/refresh policy for grades (likely: refresh on-demand + daily, not on every
      timetable sync — grades change far less often than substitutions).

**Exit:** an opted-in user sees e-klase grades for a subject next to that subject's EduPage
lessons, offline-cached, with credentials stored securely and the feature clearly optional.

---

## Phase 7 — iOS via PWA on Vercel  (size: S–M, fast-follow after v1)

**Goal:** iOS users get the app too, without an Apple developer account or a native iOS build.
No App Store, no Xcode — a PWA installed via Safari's "Add to Home Screen" is the only realistic
path for a non-commercial, ~100–250-user school project.

This does **not** touch the Android/Capacitor app or the widget — same `src/` web build, a second
deployment target. The `apiBaseUrl()` proxy rule (see Conventions) needs a real answer for this
target: iOS Safari, like the Vite dev proxy, has no `CapacitorHttp` to bypass CORS, and
`pikcrvt.edupage.org` sends none. That is decided as part of this phase, below.

- [ ] **Decide the CORS path first.** Three options, in order of preference:
  1. A Vercel **serverless rewrite/proxy** (`vercel.json` rewrite or an `api/` edge function) that
     forwards `POST` to `pikcrvt.edupage.org` and adds no auth of its own — same shape as the Vite
     dev proxy, just hosted. This is the only piece of the whole project that would run off-device;
     confirm it stays acceptable under "no backend server in v1" (it holds no state, no database,
     no credentials — pure pass-through — so it's closer to a CDN edge rule than a backend, but
     say so explicitly rather than assuming).
  2. A public CORS-passthrough proxy (e.g. `corsproxy.io`) — fastest to ship, but a third party
     sees every request; reject unless (1) turns out to be infeasible.
  3. Ask the school to add CORS headers — unlikely to happen, not worth blocking on.
- [ ] `manifest.json` (or `manifest.webmanifest`): name, short_name, `display: standalone`,
      `theme_color`/`background_color` from `src/ds/tokens/`, icons (same source art as the Android
      adaptive icon from Phase 4, re-exported at PWA sizes: 192/512 + maskable).
- [ ] iOS-specific meta tags `index.html` needs beyond the manifest (Safari ignores parts of the
      spec): `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
      `apple-touch-icon`, splash-screen `<link>`s per device size (or accept the plain white
      splash and skip these).
- [ ] Service worker for offline app-shell caching (Workbox via `vite-plugin-pwa`, or hand-rolled)
      — separate from the existing `db/`+`sync/` data cache, which already works offline; this
      only needs to cache the JS/CSS/HTML shell so the app *opens* offline, not just renders stale
      data once open.
- [ ] Vercel project: static build (`npm run build` → `dist/`) + the CORS rewrite from step 1;
      confirm `apiBaseUrl()` picks the right origin in this deployment (neither the Vite dev proxy
      path nor the Capacitor direct-fetch path — a third branch keyed off `import.meta.env`).
- [ ] No local notifications, no home-screen widget on this target — both are native-only
      (`@capacitor/local-notifications`, the Kotlin `AppWidgetProvider`) and iOS Safari PWAs can't
      host either. State this plainly in Settings/about so iOS users don't expect Phase 4 parity.
- [ ] Update `README`/about copy: "Android: Play testing track. iOS: install as a web app from
      Safari — no App Store account, tap Share → Add to Home Screen."

**Exit:** the Vercel URL, opened in iOS Safari and added to the home screen, launches full-screen
(no browser chrome), works offline for previously-synced days, and shows the same DayView/WeekView
as Android — without any change to the Android app or the widget.

---

## Parallel track — home-screen widget spike  (size: M–L, start after Phase 0)

Capacitor has no App Widget API — this is native Kotlin. Do a spike early so its data
needs shape the JS side.

- [ ] Kotlin `AppWidgetProvider` + `RemoteViews` layout: current/next lesson, room, countdown.
- [ ] Data bridge: tiny custom Capacitor plugin (or `@capacitor/preferences` shared file) —
      JS writes a `widget.json` (`{ current, next, updatedAt }` from `resolve.ts`) after each sync;
      widget reads it, no network in the widget.
- [ ] Update cadence: on app sync + `AlarmManager`/`updatePeriodMillis` (min 30 min) + at period boundaries.
- [ ] Sizes: 2×1 (next lesson) and 4×2 (rest of today).

**Exit:** widget on the home screen shows the right "next lesson" and updates after the app syncs.

---

## Decisions needed (recommendation first)

1. **Storage:** `idb` (IndexedDB) — *recommended*; works in web preview too, data is tiny.
   Alt: `@capacitor-community/sqlite` if you later want SQL queries / big history.
2. **Widget in v1 or fast-follow?** *Recommend: v1* — it's the whole reason to build this;
   but scope it to the 2×1 "next lesson" only, 4×2 can be fast-follow.
3. **i18n scope for v1:** *Recommend LV + EN + RU* chrome; substitution `raw` stays LV.
   Alt: LV-only to ship faster.
4. **Building selection UX:** confirm whether any class ever appears in both TIC and Galvenā ēka
   in the same week (quick data check across a few `ttNum`s). If never → auto-detect building
   from the class, no switcher. If yes → explicit switcher.
5. **Node HTML parser:** `happy-dom` — *recommended* (fast, Vitest-native). Alt: `linkedom`.
6. **Date/time lib:** `date-fns` + `@date-fns/tz` — *recommended*. Temporal polyfill if you
   want to go modern.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| EduPage changes the undocumented API | All of it isolated in `lib/edupage`; fixtures + tests; version the parser; probes in `reference/` to re-derive fast |
| School switches UI language → `.info` grammar breaks | `raw` always kept; "canary" test on `other` ratio; parser keyed by detected locale |
| Android kills background refresh | On-open/resume refresh is primary; background + widget alarm are best-effort; be explicit in UI ("updated Xm ago") |
| Anonymous `gsechash` stops working | Document the login flow (`edubarLogin.php` + `csrfauth`) as a fallback; don't build until needed |
| Wrong building picked → confusing timetable | Decision #4; clear building indicator on every screen |
| Weekly `ttNum` not published yet for the upcoming week | `stale` flag + banner; fall back to previous week with a warning |
| Cross-day moved lessons double-count in `resolveDay` | `moved_out` empties the source slot; `moved_in` only added when its `movedFromDate`/period resolves; covered by a resolve test |
| e-klase login flow breaks/changes, or "Sekmju izraksts" gets gated like the in-app gradebook | Isolate in `src/lib/eklase/`, probe-first (Phase 6); feature is opt-in so a breakage degrades to "no grades", never blocks the timetable |
| Storing e-klase credentials on-device raises the app's privacy/trust bar | Secure storage only, opt-in default-off, explicit disclosure it's unofficial (Phase 6) |

## Out of scope for v1

Telegram bot · per-student login (messages, lunch) · multi-school support ·
push notifications via server · teacher/classroom timetable views (data supports it — later).
e-klase grades: tracked as **Phase 6**, a fast-follow after v1 ships — not dropped, but not v1.
iOS: tracked as **Phase 7** (PWA on Vercel, since there's no Apple developer account) — same
fast-follow status, no native app, no notifications/widget on that platform.

## Definition of done (v1)

Pick class → correct today/week view, online and offline, in LV/EN/RU · substitutions applied
with visible diffs · local notification on favorite-class changes · home-screen "next lesson"
widget · on Play closed testing · used by ≥5 schoolmates for a week.
