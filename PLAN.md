# EduPage timetable app — action plan

Status: Phases 0–4, the Parallel Widget Track, and Phase 7 (Web/iOS PWA on Cloudflare Pages)
are complete (scaffold, tooling, Capacitor, scraper + parser, offline cache + sync, UI, customization
& themes, Android packaging, edge-to-edge, local notifications, WorkManager background refresh, native
2×1, countdown & 4×2 home-screen widgets, Cloudflare Pages edge proxy + PWA + Web Push).
Next: Phase 5 (Release & Distribution via GitHub Releases, Cloudflare download site, and OTA updates),
Phase 6 (e-klase grades integration exploration), and Phase 8 (Teacher Mode).
Research artefacts: `MODEL.md`, `src/lib/edupage/types.ts`, `reference/probe_*.py`, `data/` fixtures.
This plan takes it from research → shipped Android v1 & Cloudflare PWA.

## Guiding constraints (fixed)

- **Mobile-first, local-first.** Everything runs on-device. No central database server in v1.
- **Capacitor + React (Vite + TS, strict).** One codebase for both Android native APK and Web/iOS PWA.
- **No Google Play Store distribution:** High legal risk (aSc / EduPage cease & desist or court threats).
  Distributed directly via GitHub Releases (APK) and the web app (`stundio.pages.dev` with `/apk` redirect).
- **Web & iOS via Cloudflare Pages + Workers:** Cloudflare Functions (`/api-edupage`) terminate browser CORS
  against EduPage, serve the PWA, and dispatch Web Push notifications via cron workers.
- **Telegram bot: deferred.** Not in v1 scope.
- **Value proposition = glanceable schedule.** Native Android home-screen widgets (2×1 next lesson, countdown,
  4×2 all-day) + iOS PWA "Add to Home Screen" with Web Push notifications.
- **Target school:** `pikcrvt.edupage.org` (Rīgas Valsts tehnikums). Public data, class-based
  (no per-student login).

## Architecture snapshot

```
CapacitorHttp (Android) ───────────┐
                                    ├─► client.ts ─► normalize.ts ─┐
CF Edge Proxy (Web/PWA) ───────────┘              └─ substitutions.ts ┤
                                                                      ├─► resolve.ts ─► ResolvedDay ─► Zustand ─► UI
                                               idb (cache) ◄─► sync.ts ┘                                 │
                                                                                widget bridge (Android) ◄┤
                                                                                CF Web Push (PWA/iOS)   ◄┘
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
- [x] Verify `npx cap run android` shows the app on a device/emulator (verified and shipped via GitHub Releases `v1.0.0` through `v1.1.11`).
- [x] Move `contract.ts` → `src/lib/edupage/types.ts`; delete root copy; fix `MODEL.md` link.
- [x] ~~Copy `data/*` → `__tests__/fixtures/`~~ → tests read repo-root `data/` via
      `__tests__/fixtures.ts`; one copy, no drift between probe output and tests.
- [x] Move `probe_*.py` → `reference/`.

**Exit:** ✅ met. Blank themed app launches on Android; test suite and CI pipelines are green. Tagged APK releases running on physical hardware.

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

## Phase 4 — Android packaging, customization & widgets  (size: M — complete)

- [x] **Customization settings** (extends the Phase 3 Settings screen): user-controlled
      appearance, stored in `db/` `settings` store like the rest of Settings, applied through
      `src/ds/` tokens/CSS variables — no new hardcoded colours.
  - [x] **Theme:** system/light/dark; dark mode has dedicated high-contrast black/white styling
        re-pointing semantic `--brand` / `--text-on-brand` tokens.
  - [x] **Per-subject colours & Custom Color Wheel:** users can pick from DS pastel accents or
        use an interactive SVG **Color Wheel** (`ColorWheel` component) to assign arbitrary RGB/HSV
        colors to subjects. High-contrast readable ink is dynamically computed (`readableInk()`).
  - [x] **Monochrome mode:** toggle subject colour-coding off entirely (falls back to a
        single neutral tone across lesson rows, WeekView cells, and rails).
  - [x] Settings UI: "Appearance" section in `CustomizationSheet` with subject swatches, tone
        picker, custom color wheel, and a "reset to defaults" action.
- [x] App icon, adaptive icon, splash, status-bar styling, edge-to-edge (`SystemBarsPlugin` native Android integration).
- [x] `@capacitor/app` resume → `refresh()`. `@capacitor/network` → offline detection & banner.
- [x] `@capacitor/local-notifications`: after a foreground/resume sync, if today's (or
      tomorrow's) substitutions changed vs the cached snapshot → fire a local notification.
      Diffs the raw `DaySubstitutions` in `sync/engine.ts` rather than the resolved view;
      gated on the device having synced before. Includes configurable "n minutes before next lesson"
      reminders (`src/lib/schedule/reminders.ts` + `src/notifications/`) and one-shot update notifications.
- [x] **Share the week as an image**: exports class week card with form teacher, period rows,
      times, subject accents, and building notes. Includes a subject-name key and on-device QR code
      generator (`lib/share/qr.ts`). Handed directly to Android's share sheet via custom `ImageShare`
      plugin, with Web Share API / download fallback.
- [x] **Subgroups support**: `SubgroupPicker` allowing students in classes with split divisions
      (e.g., 1. grupa / 2. grupa) to select and filter their schedule.
- [x] **In-app feedback**: `FeedbackSheet` and `FeedbackPrompt` providing in-app submission for bug reports
      and feature suggestions via Web3Forms (no third-party external forms required).
- [x] **Localization expansion**: added Ukrainian (`ua.ts`) alongside Latvian (`lv.ts`), English (`en.ts`),
      and Russian (`ru.ts`).
- [x] Background refresh: WorkManager periodic task (`WidgetRefreshWorker`) to keep schedule and widgets
      fresh in the background. Android battery optimizations documented; on-open/resume is primary path.
- [ ] No FCM / push in v1 (needs a server — folds into the deferred bot's backend later).

**Exit:** ✅ met. Installed app refreshes on open/resume, displays offline warnings, supports custom
color customization and subgroups, delivers local notifications, and supports background refresh.

---

## Phase 5 — Release & distribution  (size: S–M — in progress)

**Distribution model:** No Google Play Store publication. EduPage / aSc legal risk (C&D / court exposure)
makes centralized app store distribution dangerous for an unofficial school timetable parser.
Distribution is handled directly via:
1. **GitHub Releases** (signed Android APKs).
2. **Cloudflare Pages web app** (`stundio.pages.dev`) with direct `/apk` and `/download` redirect endpoints.
3. **In-app self-updater** for Android (OTA updates directly from GitHub releases without Google Play).

- [x] Tag `v1.0.0` (tagged `v1.0.0-ozols` through `v1.1.11-lacplesis`; APKs published on GitHub Releases).
- [x] Web download & `/apk` redirect: Cloudflare Pages edge function (`functions/apk.ts` and `functions/download.ts`)
      queries GitHub latest releases and issues a 302 redirect with fallback.
- [x] Android web download banner (`AndroidDownloadBanner.tsx`) prompting Android web visitors on `stundio.pages.dev` to install the APK.
- [x] In-app OTA self-updater (`InAppUpdatePrompt.tsx` + `ApkInstaller` plugin): checks GitHub releases API and guides the user through on-device update installation.
- [x] `README` (installation guides for Android APK and iOS PWA, architecture notes, dev build commands), `LICENSE`.
- [x] Plausible analytics (`lib/analytics/`): opt-out, privacy-friendly, zero cookies, no persistent identifiers.
- [ ] Explicit non-commercial educational disclaimer & privacy statement published in app footer / web.
- [x] Google Play Store submission deliberately avoided (eliminates legal/court liability from EduPage).

**Exit:** users install APKs via `stundio.pages.dev/apk` or GitHub Releases; installed apps auto-detect and install updates; ≥5 schoolmates using it for a week without a blocking bug.

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

## Phase 7 — Web & iOS via PWA on Cloudflare Pages  (size: S–M — complete)

**Goal:** iOS and desktop users get the app without an Apple developer account, Xcode, or App Store approval.
A PWA installed via Safari's "Add to Home Screen" provides a full-screen, offline-capable timetable experience.
Deployed to Cloudflare Pages (`stundio.pages.dev`) with Cloudflare Functions for CORS bypass and Web Push notifications.

- [x] **Decide the CORS path first:** Cloudflare Pages Function edge proxy (`functions/api-edupage/[[path]].ts`)
      forwards `POST` to `pikcrvt.edupage.org` on the same origin with SSRF protection (`^[a-zA-Z0-9-]+$`).
- [x] `manifest.webmanifest`: name, short_name, `display: standalone`, theme tokens, icons (192, 512, maskable).
- [x] iOS-specific meta tags in `index.html`: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`,
      `apple-touch-icon`.
- [x] Service worker for offline app-shell caching (`public/sw.js`).
- [x] Cloudflare Pages deployment: static build (`dist/`) with GitHub Actions CD (`.github/workflows/ci.yml`).
- [x] **Web Push notifications & cron dispatch:** Cloudflare Functions (`functions/api-push/`) + GitHub Actions
      cron workflow (`.github/workflows/push-cron.yml`) to check substitutions and dispatch push notifications for PWA subscribers.
- [x] **iOS install UX:** startup "Add to Home Screen" prompt for iPhone users (`IphoneInstallSheet`), tutorial card (`IphoneReleaseSheet`), and settings platform notice.
- [x] Update `README`: iOS PWA installation instructions.

**Exit:** ✅ met. The Cloudflare Pages URL (`stundio.pages.dev`), opened in iOS Safari and added to the home screen,
launches full-screen, works offline for cached days, supports Web Push notifications for schedule changes,
and renders the same DayView/WeekView as Android.

---

## Phase 8 — Teacher Mode ("Choose Your Side")  (size: L)

**Goal:** a second persona over the same public, anonymous EduPage dataset. A teacher picks their
name, sees their own teaching day (classes + room + building), and gets substitution cover duties
(*aizvietošanas stundas*) surfaced as the day's most important thing. Zero logins, zero new
endpoints, zero new network traffic — the cover feed is already inside the cached class-mode
substitutions.

### What the data actually says (checked against `data/` fixtures, 2026-09-19)

Five findings that shape everything below; re-derive them before changing any of it.

1. **A teacher never has two parallel lessons — but does teach merged classes.** Across the 2768
   *placed* cards of `regulartt_1175`, there are **0** slots where one teacher has two distinct
   lessons. The 228 apparent collisions in the class-expanded probe output are one `Lesson` with
   several `classIds` (132 of 1110 lessons, e.g. `S3-1 + S3-2 · Matemātika I`). A teacher card is
   therefore **one row listing several classes**, never duplicated rows.
2. **The substitution feed reverses the name order.** `teachers.short` is `"Ķere Gene"`
   (Surname Name); the feed prints `"Gene Ķere"` (Name Surname). Exact matching resolves
   **3 of 18** names in the 2026-09-09 fixture; a token-sorted, lowercased key resolves **18/18**.
   This is also a live bug in student mode: `resolve.ts`'s `teachersByLabel.get()` almost always
   misses and falls back to `synthTeacher`, losing the real id and colour, and `notes.ts` filters
   on the same labels. Fixing it is a prerequisite, not a side quest.
3. **`mode: "classes"` is enough.** Every row carries `teacher` (who teaches/covers) and
   `teacherFrom` (who is being covered), so "my cover duties" is a filter over data already in the
   cache. `mode: "teachers"` stays a `reference/` oracle only — no second fetch, no second parser,
   no second retention window.
4. **The absent-teacher line is real and currently dropped.** `Skolotāji, kuri nepiedalās: …`
   lives in a bare `div[style="text-align:center"]`, not `.subst_note` (MODEL.md §4 flags it as a
   gap). The fixture lists four names. For a teacher this answers both "am I marked absent?" and
   "who is out → where the cover is coming from".
5. **Counts.** 147 rows in `teachers`, but only **116** actually teach — the picker lists the 116,
   or ~31 profiles open empty. **75** teachers carry `teachers.classids` (17 carry more than one),
   so the form-teacher ("klases audzinātājs") dual role is derivable from the data, never configured.

Two freebies fall out of the model: pointer rows (MODEL.md §3) carry no teacher, so they are
excluded from a teacher's day automatically; and the 568 unplaced cards are skipped exactly as
they already are.

### What matters to a teacher (and what does not)

**P0 — the reason the app gets opened**

- What is on now / next, with **room, class(es) and building**. Room ranks higher than it does for
  students: the teacher is the one who moves.
- **Cover duties assigned to me.** The only thing that appears without warning and costs real
  money to miss.
- My cancelled / moved lessons — "period 3 is free" is the plan for the day.
- A building switch inside one day: for a teacher that is a commute, not a staircase.

**P1 — makes the day better**

- Gaps between lessons (`day-gap` already renders these at the ≥20 min threshold).
- Today's absent colleagues (finding 4).
- Contact-hour load per day and per week (the busiest teacher in the fixture has 59 slots, 20 of
  them on Friday — worth showing).
- Form teacher: one tap to their own class's day and that class's changes.
- A notification for *an assigned cover*, distinct from the general day diff.

**P2 / explicitly not in this phase**

- Subgroups (`SubgroupPicker`) — a student concept; hidden in teacher mode.
- The teacher's own name on the card — redundant; the space goes to class and room.
- Share-the-week image — works, low priority.
- Home-screen widgets — still deferred (the payload is shared, so this stays cheap later).
- e-klase grades (Phase 6) — unrelated to this persona.
- Any login. The persona is a local preference, nothing more.

### "Choose Your Side"

- **Where:** a new onboarding step between `onboarding-intro` and the picker —
  `step: "language" | "intro" | "persona" | "picker"` in `App.tsx`. Two large cards
  (*Skolēns* / *Skolotājs*) in the same full-bleed brand treatment as `OnboardingIntro`.
- **What it changes:** which picker opens next and which resolve branch runs. Nothing else.
- **Reversible:** a switch in Settings (`class-section` → `identity-section`). Switching persona
  never clears the cache — the timetable is shared, only the selection changes.
- **Stored:** `persona: "student" | "teacher"` and `selectedTeacherId` in `Settings`, defaulting to
  `"student"`, so an existing install is untouched and no migration is needed (asserted by a test
  over a settings blob that predates the field).
- **Dual role:** when the selected teacher has `classids`, the DayView header grows a
  `Manas stundas | Mana klase` segment — no second persona, no second onboarding.
- **Onboarding gate** becomes `persona === null || (student && !classId) || (teacher && !teacherId)`.

### Work by layer

**`src/lib/edupage/`**

- [ ] `teacher-names.ts`: `teacherKey(name)` (lowercase + token-sort, diacritics kept, LV locale)
      and `indexTeachersByKey`. Wired into `resolve.ts` and `notes.ts` too — finding 2.
- [ ] `resolveTeacherDay(sources, subs, teacherId, date)` beside `resolveDayAcross`: select on
      `teacherIds ∋ id`, collapse `classIds` onto one card, same multi-building merge and dedup.
- [ ] `TeacherResolvedLesson` = `ResolvedLesson` minus `group`, plus `classes: ClassRef[]`,
      `role: "own" | "cover"`, `coverFor: TeacherRef | null`.
- [ ] `coverDuties(subs, teacherId, timetables)` — feed rows naming me where the base day does not.
- [ ] `absentTeachers` selector in `substitutions.ts` → optional `DaySubstitutions.absentTeachers`
      (optional so a cached day written by an older build still parses).
- [ ] `listTeachers(timetables)` — only teachers with placed lessons, each with its `formClassIds`.

**`src/db` / `src/store` / `src/sync`**

- [ ] `Settings`: `persona`, `selectedTeacherId`, `teacherView: "own" | "form-class"`,
      `highlightCoverLessons`; setters on the store.
- [ ] `resolvedTeacherDay(date)` selector, mirroring `resolvedDay`.
- [ ] `sync/` unchanged — same requests, same cadence, same retention.

**`src/ui`**

- [ ] `onboarding-persona/` and `teacher-picker/` (same shape as `class-selector`: search + list).
- [ ] DayView / WeekView teacher cards: `[Class(es)] [Room] [Subject] [Period times]`, cover
      lessons badged in high contrast; subgroup and "my class" controls hidden.
- [ ] ChangesView: `Manas izmaiņas | Visa skola`, plus an "absent today" block.
- [ ] SubjectsView: "my classes" (class + hours) instead of "my subjects".
- [ ] i18n: ~25–35 new keys × 4 languages; `lv.ts` is the typed source, so the other three fail the
      build until translated.
- [ ] Notifications: diff over *my* rows; a dedicated string for an assigned cover.
- [ ] Web/PWA parity verified on `stundio.pages.dev`.

### PR order

Every row is its own branch and PR, tested, per AGENT.md. Baseline before this phase:
799 tests / 65 files green, coverage thresholds 90/80 enforced in `vite.config.ts`.

| # | Branch | Content | Size | Acceptance |
|---|---|---|---|---|
| T0 | `chore/probe-teacher-mode` | `reference/probe_teachers.py`: `mode:"teachers"` + absent-line fixtures; MODEL.md §7 | S | Fixture lands in `data/`; zero app code |
| T1 | `fix/teacher-name-matching` | `teacher-names.ts`, wired into `resolve.ts` / `notes.ts` | S | All 18 fixture names resolve to real `TeacherRef`s, none to `subst:` |
| T2 | `feat/resolve-teacher-day` | `resolveTeacherDay`, `coverDuties`, `listTeachers` | L | Busiest teacher on 2026-09-09: no duplicate rows, merged classes on one card, covers flagged; property test "no teacher ever holds two lessons in one slot" |
| T3 | `feat/subst-absent-teachers` | absent-teacher line parser | S | 4 names from the fixture; a missing line never throws |
| T4 | `feat/persona-settings` | `Settings` + store + defaults | S | A settings blob without `persona` reads back as `student` |
| T5 | `feat/choose-your-side` | persona onboarding step, `TeacherPicker`, Settings switch | M | Both onboarding branches covered; switching persona keeps the cache |
| T6 | `feat/teacher-day-week` | teacher cards, cover badge, student-only controls hidden | L | Snapshot tests for both personas off the real fixtures |
| T7 | `feat/teacher-changes-view` | my-changes tab + absent colleagues | M | Teacher sees only rows naming them; school-wide tab unchanged |
| T8 | `feat/teacher-dual-role` | form-teacher segment | M | Teacher with `classids` sees it, teacher without does not |
| T9 | `feat/teacher-notifications` | cover-assignment diff and strings | M | A new cover for me notifies; an unrelated change does not |
| T10 | `chore/teacher-docs-i18n` | 4 languages, PRODUCT/PLAN/README, PWA check | S | CI green end to end |

### Decisions to lock before T2

1. **Cover source: class-mode feed** — *recommended*. No new request, one parser, works offline
   from today's cache. `mode:"teachers"` stays an oracle in `reference/`.
2. **Match on normalised name, not id.** The feed carries no ids, and ids are renumbered on every
   weekly republish. Needs a canary test: unresolved teacher names must stay < 10%.
3. **No "favourite teachers".** `favorites` remains class-only; a teacher selects one profile.
4. **Namesakes.** No collisions on the normalised key in the current table, but a test must assert
   it, and the picker shows a subject line as a tiebreaker when the key is not unique.

**Exit:** a teacher picks their side and their name during onboarding, sees their teaching day and
week with correct classes, rooms and buildings, sees assigned cover duties highlighted and who is
absent today, can jump to their form class if they have one, and all of it works offline and on
`stundio.pages.dev`.

---

## Parallel track — home-screen widget spike  (size: M–L — complete)

Capacitor has no App Widget API — native Kotlin and Java AppWidgetProviders were built and bridged:

- [x] Kotlin/Java `AppWidgetProvider` + `RemoteViews` layouts:
  - **Next Lesson (2×1)**: `NextLessonWidget` showing current/next lesson, room, teacher, countdown/times, and status.
  - **Countdown**: `CountdownWidget` focusing on remaining minutes with visual progress bar.
  - **All-Day (4×2)**: `AllDayWidget` with scrollable list via `AllDayRemoteViewsFactory` of today's schedule.
- [x] Data bridge: `StundioWidgetPlugin` Capacitor plugin bridge + `src/lib/widget/` (`WidgetPayload`, `native.ts`, `wire.ts`) —
      JS computes rendered widget payloads and pushes to native SharedPreferences; widget views read locally without network calls.
- [x] Update cadence: on app sync + `WidgetScheduler` (exact alarms at period start/end boundaries) + `WidgetRefreshWorker` (WorkManager periodic refresh).
- [x] Sizes & kinds: 2×1 (next lesson), countdown tile, and 4×2 (all-day list).

**Exit:** ✅ met. All three widgets render reliably on the Android home screen, display live status, and update automatically.

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
| Google Play legal exposure from EduPage / aSc | Eliminated: distribute directly via GitHub Releases and Cloudflare Pages (`/apk`); no store presence |
| Browser CORS against EduPage on Web/iOS | Cloudflare Pages Function edge proxy (`functions/api-edupage/`) handles CORS and forward headers |
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
FCM server push (handled via Android WorkManager locally and Cloudflare cron Web Push for PWA) ·
Google Play Store listing (deliberately out of scope to avoid legal exposure from EduPage) ·
classroom timetable views (data supports it — later); teacher mode tracked in Phase 8.
e-klase grades: tracked as **Phase 6**, a fast-follow after v1 ships — not dropped, but not v1.

## Definition of done (v1)

Pick class → correct today/week view, online and offline, in LV/EN/RU/UA · substitutions applied
with visible diffs · local notification / Web Push on favorite-class changes · home-screen "next lesson"
widget (Android) & PWA Add-to-Home-Screen (iOS) · APK releases published on GitHub and downloadable via
`stundio.pages.dev/apk` · in-app update notification functioning on device · used by ≥5 schoolmates for a week.
