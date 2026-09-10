# CLAUDE.md

## What this is

Android app that scrapes the **EduPage timetable of Rīgas Valsts tehnikums**
(`https://pikcrvt.edupage.org`) and shows it in a clean, fast, offline wrapper.
Class-based (no per-student login). Audience: portfolio + personal + schoolmates (~100–250).

## Status

Phases 0–3 done. Scaffold (Vite + React 19 + TS strict, Tailwind v4, Vitest/happy-dom, ESLint,
Prettier, GitHub Actions CI, Capacitor Android project), the complete EduPage layer in
`src/lib/edupage/` (fetch → normalize → parse → select → resolve), the offline layer
(`src/db/` idb cache + `src/sync/` stale-while-revalidate + `src/store/` Zustand), and the UI
in `src/ui/` (ClassPicker · DayView · WeekView · Subjects · LessonSheet · Settings, LV/EN/RU,
dark mode). The **Studio Design System** is vendored into `src/ds/` and every screen is built on
it. 247 tests, 96% line coverage. On-device launch still unverified (no JDK / Android SDK here).
Next: **Phase 4** — Android packaging + local notifications; the widget spike is unblocked.
Full roadmap: **`PLAN.md`**.
Data/API contract: **`MODEL.md`**. Canonical types: **`src/lib/edupage/types.ts`**.

## Fixed constraints

- **Local-first, mobile-first.** Everything runs on-device. **No backend server in v1.**
- **Stack: Capacitor + React (Vite + TS strict).** Not React Native, not pure PWA
  (EduPage sends no CORS headers → scraping needs `CapacitorHttp`).
- **Telegram bot: deferred.** Not v1.
- **The value proposition is a home-screen "next lesson" widget** (native Kotlin). If a
  change would trade the widget away for convenience, stop and ask.

## Repo map

| Path | What |
|---|---|
| `MODEL.md` | EduPage endpoints, payloads, table shapes, join recipe, substitution HTML grammar, merge algo |
| `PLAN.md` | Phased action plan (0–5 + widget spike), decisions needed, risks |
| `src/lib/edupage/` | The whole EduPage layer — import it via its `index.ts` barrel, never a sibling file |
| `src/lib/edupage/types.ts` | Canonical TS data model (`Timetable`, `Substitution`, `ResolvedDay`, …) |
| `src/lib/edupage/http.ts` | `HttpClient` + the **only** Capacitor import in the layer (ESLint-enforced) |
| `src/lib/edupage/client.ts` | The three endpoint calls; the single place the `{ e }` envelope is checked |
| `src/lib/edupage/normalize.ts` | Raw aSc tables → `Timetable` (the cards→lessons→groups join) |
| `src/lib/edupage/substitutions.ts` | Latvian HTML → `DaySubstitutions`; never throws, always keeps `raw` |
| `src/lib/edupage/select.ts` | Pick `tt_num` by (date, building); sets `stale` |
| `src/lib/edupage/resolve.ts` | `Timetable` + `DaySubstitutions` → `ResolvedDay` |
| `src/db/` | `AppCache` port + idb and in-memory implementations (one shared contract test) |
| `src/sync/` | Refresh policy (12h list / cached week / always-substitutions), retention, resume listener |
| `src/store/` | Zustand store (vanilla + context), memoised `resolvedDay(date)`, `boot.ts` wiring |
| `src/lib/schedule/` | Pure "what's on now / next" + week arithmetic. **No React, no Capacitor** — the Kotlin widget is written against these rules and tests |
| `src/ds/` | **Studio Design System**, vendored from Claude Design. `tokens/` · `components/ui/` (shadcn-shaped: `cn()`/CVA/Radix) · `lib/utils.ts`. Import via the `index.ts` barrel, never a component file |
| `src/ds/tokens/` | Verbatim copies of the DS token files — **do not hand-edit, re-pull.** `dark.css` and `fonts.css` are the two authored-here exceptions, documented in place |
| `src/ui/` | The screens. `screens/` · `components/` (thin adapters over `src/ds/`) · `hooks/` · `i18n/` (LV source dict, EN/RU typed against it) · `theme/` (dark-mode hook, subject→accent mapping, status→tone tables) |
| `src/ui/__tests__/harness.tsx` | Boots a real store over the `data/` fixtures for screen tests; no network |
| `src/lib/edupage/__tests__/fixtures.ts` | Fixture reader — tests read repo-root `data/` directly, never a copy |
| `reference/probe_edupage.py` | Working timetable scraper — regenerates `data/` fixtures, re-derives the API |
| `reference/probe_substitution.py` | Working substitutions scraper + HTML parser (stdlib only) |
| `data/` | Raw + normalized fixtures (2026-09-09). The single copy — parser tests read it directly. |
| `android/` | Capacitor Android project (generated; the Kotlin widget lands here) |

Planned app layout is in `PLAN.md` → "Architecture snapshot". Keep it a single Vite app (no monorepo) for v1.

## EduPage facts that bite (details in MODEL.md)

- All endpoints are **public**, `POST`, body `{"__args":[null,<arg>],"__gsh":"00000000"}`.
  `"00000000"` is the anonymous hash — not a bug.
- Server returns HTTP 200 with `{"e":"Error: …"}` on bad input. **Always check for `e`.**
- Timetable is **republished weekly**, with a **separate `tt_num` per building**
  ("TIC" annex / "Galvenā ēka" main). Pick by date + building; flag `stale` when uncovered.
- Substitutions come **only as rendered HTML**, localized to **Latvian**. The clean JSON
  endpoints (`getSubstViewerDayData`, `curentttGetData`) require a logged-in session.
- `days`/`weeks`/`terms` in `cards` are **bitmask strings** (`"00100"` = Wednesday).
- Teachers here have only `short` populated ("Surname Name").

## Conventions

- **One place decides the request origin: `apiBaseUrl()` in `client.ts`.** `npm run dev` routes
  through Vite's `/api-edupage` proxy (no CORS headers from EduPage); every other mode — the
  production bundle Capacitor ships, and Vitest — goes straight to the school. Never hardcode the
  proxy prefix elsewhere: a device build has no dev server to proxy through. `Referer` always
  names the real school origin, whatever the request goes through.
- **All EduPage logic lives in `src/lib/edupage/`.** No Capacitor import there except `http.ts`.
  UI/store never fetches or parses EduPage directly.
- **The parser never throws.** Unknown substitution phrasing → `kind: "other"`, keep `raw`.
  `raw` (the full localized `.info` string) is always preserved — it's the only lossless field.
- **Cancelled lessons stay visible** in `ResolvedDay` with `status: "cancelled"`.
- **Tests never touch the network.** `src/sync/__tests__/fakeServer.ts` replays the `data/`
  fixtures; inject a `Boot`/`HttpClient` rather than letting a component reach the real school.
- **UI reads the cache, never the network.** `store` → `sync` → `lib/edupage`, one direction.
  The only user-initiated fetch is pull-to-refresh, and it goes through `refresh({ force: true })`.
- **All visual decisions come from `src/ds/`.** No raw hex, no ad-hoc px, no stock Tailwind palette
  colours (`slate-500`, `amber-100`) anywhere in `src/ui/` — use the DS tokens through their
  utilities (`bg-card`, `text-muted`, `rounded-xl`, `shadow-card`). `index.css` maps every DS
  variable to a utility with `@theme inline`, so dark mode follows without a `dark:` override.
- **A subject's colour is one of the DS's six accents**, assigned by `subjectTone()` from a hash of
  the subject code — *not* EduPage's own hex, which carries no contrast guarantee. Same subject,
  same colour, on every screen and every device.
- **Chrome is translated; the school's text is not.** New user-facing strings go in
  `src/ui/i18n/lv.ts` first (it types the other two). Weekday/date names come from `Intl`.
  DS components take their strings as props rather than hardcoding the DS's English.
- **"Now / next" logic lives in `src/lib/schedule/`, not in a component** — the widget shares it.
- Parser changes must keep the fixture tests green, including the "canary" (`other` ratio < 15%).
- `probe_*.py` stay in the repo as the **cross-check oracle** for the TS parser. Update them
  and the fixtures together when the API shifts.
- Timezone is always `Europe/Riga`.

## Don't

- Don't add a backend / proxy / server to v1 (breaks local-first; folds into the deferred bot later).
- Don't scrape from UI or store code — go through `src/lib/edupage/`.
- Don't hand-edit `src/ds/tokens/*.css` (except `dark.css`) — they are verbatim copies, and the
  next design-system pull silently reverts the edit. Change the design system instead.
- Don't put emoji or unicode-as-icon in the UI (`★`, `✓`, `→`) — the DS bans it; use `<Icon>`.
- Don't translate server-provided substitution text; show it as "from school".
- Don't poll. Cache-first; refresh on app open/resume + pull-to-refresh; custom `User-Agent`.
- Don't build the login flow until the anonymous `gsechash` actually stops working.

## Commands

```bash
npm run dev          # Vite dev server; EduPage calls go through the /api-edupage proxy
npm test             # Vitest (happy-dom)
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint
npm run format       # prettier --write (markdown is intentionally excluded)
npm run build        # tsc -b && vite build → dist/
npm run android      # build + cap sync + cap run android  (needs JDK 21 + Android SDK)

# Re-derive the API / regenerate fixtures (needs python3 + requests):
python3 reference/probe_edupage.py                    # timetable → data/
python3 reference/probe_substitution.py 2026-09-09    # substitutions → data/
```

CI (`.github/workflows/ci.yml`): `lint → format:check → typecheck → test:coverage → build`,
on push to `main`, on PRs, and manually. Coverage thresholds live in `vite.config.ts`.
