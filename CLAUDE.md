# CLAUDE.md

## What this is

Android app that scrapes the **EduPage timetable of Rīgas Valsts tehnikums**
(`https://pikcrvt.edupage.org`) and shows it in a clean, fast, offline wrapper.
Class-based (no per-student login). Audience: portfolio + personal + schoolmates (~100–250).

## Status

Research phase done. No app scaffold yet. Next steps and full roadmap: **`PLAN.md`**.
Data/API contract: **`MODEL.md`**. Canonical types: **`contract.ts`** (moves to
`src/lib/edupage/types.ts` in Phase 0).

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
| `contract.ts` | Canonical TS data model (`Timetable`, `Substitution`, `ResolvedDay`, …) |
| `probe_edupage.py` | Working timetable scraper — regenerates `data/` fixtures, re-derives the API |
| `probe_substitution.py` | Working substitutions scraper + HTML parser (stdlib only) |
| `data/` | Raw + normalized fixtures (2026-09-09). Become test fixtures + parser oracle. |

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

- **All EduPage logic lives in `src/lib/edupage/`.** No Capacitor import there except `http.ts`.
  UI/store never fetches or parses EduPage directly.
- **The parser never throws.** Unknown substitution phrasing → `kind: "other"`, keep `raw`.
  `raw` (the full localized `.info` string) is always preserved — it's the only lossless field.
- **Cancelled lessons stay visible** in `ResolvedDay` with `status: "cancelled"`.
- Parser changes must keep the fixture tests green, including the "canary" (`other` ratio < 15%).
- `probe_*.py` stay in the repo as the **cross-check oracle** for the TS parser. Update them
  and the fixtures together when the API shifts.
- Timezone is always `Europe/Riga`.

## Don't

- Don't add a backend / proxy / server to v1 (breaks local-first; folds into the deferred bot later).
- Don't scrape from UI or store code — go through `src/lib/edupage/`.
- Don't translate server-provided substitution text; show it as "from school".
- Don't poll. Cache-first; refresh on app open/resume + pull-to-refresh; custom `User-Agent`.
- Don't build the login flow until the anonymous `gsechash` actually stops working.

## Commands

```bash
# Re-derive the API / regenerate fixtures (needs python3 + requests):
python3 probe_edupage.py                    # timetable → data/
python3 probe_substitution.py 2026-09-09    # substitutions → data/
```

App build/test commands land here in Phase 0.
