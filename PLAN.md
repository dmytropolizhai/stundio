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

- [ ] App icon, adaptive icon, splash, status-bar styling, edge-to-edge.
- [ ] `@capacitor/app` resume → `refresh()`. `@capacitor/network` → offline banner.
- [ ] `@capacitor/local-notifications`: after a background/foreground sync, if today's (or
      tomorrow's) `ResolvedDay` for a favorite class changed vs last snapshot → fire a local
      notification ("Tomorrow: 1st period cancelled"). Diff logic reuses `resolve.ts`.
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

## Out of scope for v1

Telegram bot · iOS · per-student login (grades, messages, lunch) · multi-school support ·
push notifications via server · teacher/classroom timetable views (data supports it — later).

## Definition of done (v1)

Pick class → correct today/week view, online and offline, in LV/EN/RU · substitutions applied
with visible diffs · local notification on favorite-class changes · home-screen "next lesson"
widget · on Play closed testing · used by ≥5 schoolmates for a week.
