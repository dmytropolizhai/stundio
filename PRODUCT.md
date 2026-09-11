# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students of Rīgas Valsts tehnikums (RVT) — roughly 100–250 classmates of the author, plus the
author. They use it on an Android phone, one-handed, in the seconds between lessons: in a
corridor, on a bus, standing outside a room they are not sure is the right room. Connectivity is
unreliable inside the buildings, so the app is often opened with no usable network.

Secondary audience: people evaluating the author's work (portfolio viewers). Confirmed tiebreak —
**utility wins.** When student usefulness and portfolio expression disagree, the students'
glance-speed, offline reliability, and legibility take precedence; the portfolio value is meant to
come from doing that job impeccably rather than from decorating it.

## Product Purpose

Stundio scrapes the public EduPage timetable of `pikcrvt.edupage.org` and shows it as a fast,
offline, class-based schedule app.

The single job it must nail, confirmed: **"what's on now / what's next"** — a two-second glance at
the current or next lesson, its room, and how much time is left. Everything else (week overview,
subject list, lesson detail) is secondary to that glance. The home-screen widget is the purest form
of this job, and the app is its bigger sibling; the shared rules live in `src/lib/schedule/`.

Success: a classmate stops opening EduPage.

## Positioning

EduPage's own client is a general, multi-school, login-first portal. Stundio is the opposite on
every axis that matters here: one school, no login (the class is the identity), cache-first so it
works with no signal, and a home-screen widget that answers the question without opening anything.
Substitutions — which EduPage publishes only as rendered Latvian HTML for logged-in-ish viewers —
are parsed and merged into the day, so a cancelled or moved lesson shows up in the same place the
lesson did.

The widget is the stated value proposition: without it this is just another EduPage client. A
change that trades the widget away for convenience is not an acceptable trade without asking.

## Operating Context

- **Device:** Android phone, portrait, one hand, often in motion. Capacitor web view.
- **Network:** intermittent. Cache-first with stale-while-revalidate; refresh on app open/resume
  and pull-to-refresh only. No polling.
- **School data rhythm:** the timetable is republished weekly, with a separate `tt_num` per
  building ("TIC" annex and "Galvenā ēka" main). Some weeks are not covered yet — the UI must be
  able to say "this week isn't published, showing the previous one" rather than lying.
- **Two buildings.** Which building a lesson is in is a real, load-bearing fact for a student
  deciding whether they can make it.
- **Timezone is always `Europe/Riga`.**
- **Language:** the school operates in Latvian. Substitution text arrives as Latvian prose written
  by school staff.

## Capabilities and Constraints

Shipped: class picker with favourites, day view, week view, subjects view, lesson detail sheet,
settings; LV/EN/RU chrome; dark mode; offline cache; sync with staleness reporting.

Durable constraints (also enforced in CLAUDE.md):

- **Local-first. No backend server in v1.** Everything runs on-device.
- **Capacitor + React (Vite, TS strict)** — not React Native, not a pure PWA (EduPage sends no CORS
  headers, so scraping needs `CapacitorHttp`).
- **Class-based, no per-student login.** Do not build a login flow until the anonymous `gsechash`
  actually stops working.
- **The parser never throws**, and `raw` — the full localized substitution string — is always
  preserved. It is the only lossless field.
- **Cancelled lessons stay visible**, marked, in their original place.
- **Chrome is translated; the school's text is not.** Substitution prose is shown verbatim and
  labelled as coming from the school.
- **The UI reads the cache, never the network.** One direction: `store` → `sync` → `lib/edupage`.
- **"Now / next" logic lives in `src/lib/schedule/`,** not in a component — the native Kotlin
  widget is written against the same rules and tests.

Explicitly undecided / deferred: the Telegram bot (not v1), push notifications via FCM (needs a
server), background-refresh cadence beyond best-effort, on-device launch verification (no JDK /
Android SDK on the current machine), and the Play Store listing.

## Brand Commitments

- **Name: Stundio.** ("stunda" = lesson.) Renamed deliberately in commit `cf2de07`.
- **Three locales: LV (source), EN, RU.** Latvian types the other two; a missing key is a compile
  error. New user-facing strings go into `src/ui/i18n/lv.ts` first.
- **The Studio Design System is vendored into `src/ds/`** and every screen is built on it. Its
  token files are verbatim copies — changed upstream, never hand-edited here. Visual decisions come
  from DS tokens, not raw hex or stock Tailwind palette colours.
- **No emoji or unicode-as-icon** (`★`, `✓`, `→`) anywhere in the UI; icons are `<Icon>`.
- A subject's colour is one of the DS's six accents, derived by hashing the subject code, so the
  same subject is the same colour on every screen and every device — deliberately *not* EduPage's
  own hex, which carries no contrast guarantee.

## Evidence on Hand

- `data/` — real captured EduPage fixtures for 2026-09-09 (raw + normalized). The single copy;
  parser tests read it directly.
- `reference/probe_edupage.py`, `reference/probe_substitution.py` — working scrapers kept as the
  cross-check oracle for the TypeScript parser.
- `MODEL.md` — the derived API contract: endpoints, payloads, table shapes, join recipe,
  substitution HTML grammar, merge algorithm.
- 247 tests, 96% line coverage; the TS substitution parser is byte-identical to the Python probe
  over all 55 rows of the fixture.

Absences future work must not fabricate: **no real users yet** (the app has never run on a device —
no JDK/Android SDK on this machine), no downloads, no testimonials, no reviews, no Play Store
presence, no press, no logo or brand assets beyond the name, no screenshots of the app in real use.

## Product Principles

1. **The glance is the product.** Now/next, room, time left — legible in two seconds, at arm's
   length, one-handed, in a corridor. Everything else defers to it.
2. **Offline is the normal case, not the error case.** Cached data shown confidently, with honest
   staleness, beats a spinner or an empty state.
3. **Never silently lose the school's words.** Unrecognized substitution phrasing degrades to
   "other" with the raw text intact; nothing is dropped and nothing is translated.
4. **Changes belong where the lesson was.** A cancellation or a move is shown in the day's own
   structure, not in a separate feed the student has to remember to check.
5. **Utility outranks expression.** Ambition is spent on speed, clarity, and reliability; brand
   lives in precise details, not in decoration that costs a glance.

## Accessibility & Inclusion

No formal standard was established as a product requirement. Known, product-specific needs:
outdoor/corridor legibility at a glance, dark mode as a first-class theme (not an afterthought),
comfortable one-handed touch targets on a phone, and three languages with Cyrillic and Latvian
diacritics rendering correctly in every font used.
