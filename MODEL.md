# EduPage timetable — data model & source contract

Target: `https://pikcrvt.edupage.org` — **Rīgas Valsts tehnikums** (Riga, LV).
Verified 2026-09-09. Everything below is **public — no login, no cookies**.
Canonical types: [`src/lib/edupage/types.ts`](./src/lib/edupage/types.ts).
Scrapers: `reference/probe_edupage.py`, `reference/probe_substitution.py`.

---

## 1. Source endpoints

All are `POST`, `Content-Type: application/json`, body `{"__args": [null, <arg>], "__gsh": "00000000"}`.
`"00000000"` is the anonymous hash; a real `gsechash` is only needed for logged-in scopes.
No `Access-Control-Allow-Origin` header → **not callable from a browser/PWA cross-origin**
(needs Capacitor native HTTP, React Native, or a proxy).

| Purpose | URL | `<arg>` | Returns |
|---|---|---|---|
| List published timetables | `/timetable/server/ttviewer.js?__func=getTTViewerData` | `2026` (school year, int) | JSON: `r.regular.timetables[]` = `{tt_num, year, text, datefrom, hidden}`, `r.regular.default_num` |
| Full weekly timetable | `/timetable/server/regulartt.js?__func=regularttGetData` | `"1175"` (tt_num, **string**) | JSON: `r.dbiAccessorRes.tables[]` = `[{id, data_rows[]}]` (aSc format) |
| Day substitutions | `/substitution/server/viewer.js?__func=getSubstViewerDayDataHtml` | `{"date":"2026-09-09","mode":"classes"}` | JSON `{"r": "<html string>"}` — **rendered HTML**, localized |

`mode` ∈ `classes | teachers | classrooms`.

### Dead ends (require a logged-in session — anonymous → `TypeError: Cannot read ...`)
- `substitution/server/viewer.js?__func=getSubstViewerDayData` (JSON variant)
- `substitution/server/viewer.js?__func=getSubstViewerData` (metadata / date list)
- `timetable/server/currenttt.js?__func=curentttGetData` (structured, changes pre-merged — the *nice* one)

If a school account becomes available, `curentttGetData` replaces the HTML parsing entirely
and returns the effective per-day timetable as structured JSON.

---

## 2. `regularttGetData` tables (observed row counts for tt_num 1175)

`periods` 13 · `days` 5 · `classes` 122 · `teachers` 147 · `subjects` 466 ·
`classrooms` 160 · `groups` 886 · `lessons` 1110 · `cards` 3336 · `buildings` 2 ·
`weeks` 1 · `terms` 1 · `daysdefs` 7 · `weeksdefs` 3 · `termsdefs` 3 · `divisions` 482

Fields used by the scraper:

- **periods**: `{period, name, starttime, endtime}` — `period` is `"0".."12"` (string).
- **classes**: `{id, name, short, color, teacherid}`.
- **teachers**: `{id, short, color}` — ⚠️ only `short` populated here (`"Surname Name"`), no `firstname`/`lastname`.
- **subjects**: `{id, name, short, color}` — `name` and `short` are often identical (full LV title).
- **classrooms**: `{id, name, short}` — `short` like `"501 (32)P"`.
- **groups**: `{id, classid, name, entireclass, ascttdivision, divisionid}` — resolves class
  membership for divided lessons. ⚠️ The group **label** is `name` (`"1"`, `"2"`, `"1.grupa"`,
  `"Zēni"`); `ascttdivision` is only the *division index* (which split scheme), so it is NOT a
  label. The substitution feed prints the `name`, which is what `Lesson.groups` must carry —
  `lessons.groupnames[]` already holds it directly.
- **lessons**: `{id, subjectid, teacherids[], classids[], groupids[], groupnames[], durationperiods, count, terms, weeksdefid, termsdefid}`.
  1041/1110 carry `classids`; the same 1041 also carry `groupids`. ⚠️ The remaining **69 have
  neither** — they cannot be attributed to a class at all, and 64 of their cards are placed,
  so ~2 % of placed cards are unattributable and get dropped. Resolving via
  `groups[groupids].classid` adds **zero** classes beyond `classids` in this dataset; keep the
  union anyway (it is free and other schools may differ), but do not rely on it as a fallback.
- **cards**: `{id, lessonid, period, days, weeks, classroomids[], locked}`.
  One card = one placed slot. `days` / `weeks` are **bitmask strings**:
  `days = "00100"` → Wednesday (positions = Mon..Fri, length 5).
  `weeks = "1"` here (would be `"10"` / `"01"` for A/B-week schools).
  ⚠️ Cards have **no `terms` field** — `terms` lives on the *lesson*. 568 of 3336 cards have an
  empty `days`/`weeks`: those are **unplaced** and must be skipped (2768 remain).

### Join recipe (→ `Lesson` in the contract)

```
for card in cards:
    day    = weekday_from_bitmask(card.days)          # first "1"; None → unplaced, skip
    if day is None: continue
    lesson = lessons[card.lessonid]
    classIds = set(lesson.classids) | { groups[g].classid for g in lesson.groupids }
    if not classIds: continue                         # 64 placed cards die here
    → Lesson{ id: card.id, classIds, subjectId: lesson.subjectid,
              teacherIds: lesson.teacherids, roomIds: card.classroomids,
              groups: lesson.groupnames or [groups[g].name for g in lesson.groupids],
              day, period: card.period, periodSpan: lesson.durationperiods,
              weekMask: card.weeks, termMask: lesson.terms }   # terms: LESSON, not card
```

---

## 3. Timetable selection (the multi-building / weekly wrinkle)

RVT republishes the timetable **every week**, and **separately per building**:

```
tt_num 1169  2026-09-01  TIC 01.09.2026. (01.09 - 04.09.2026)
tt_num 1172  2026-09-01  Galvenā ēka 01.09.2026. (01.09 - 04.09.2026)
tt_num 1174  2026-09-07  TIC 07.09.2026. (07.09 - 11.09.2026)
tt_num 1175  2026-09-07  Galvenā ēka 07.09.2026. (07.09 - 11.09.2026)   ← default_num
```

- `default_num` = current week, main building.
- Client picks `tt_num` by: newest `datefrom` ≤ target date, matching chosen building.
  A class lives in one building per week, but the app should let the user pick / remember it.
- `ResolvedDay.stale = true` when no `tt_num` covers the target date's week yet.
- `text` parsing: building = leading token before the date; `validTo` from the `( … - … )` range.

---

## 4. Substitution HTML → `Substitution`

```
div[data-date]
  div.subst_note              → announcements (free text, keep verbatim)
  div.section        (per class)
    div.header               → className  (matches ClassRef.short)
    div.row.(change|add|remove)
      div.period > span      → "1" | "(1)" | "7 - 8" | "(7 - 8)"
      div.info   > span      → localized description
```

- `period` in **parentheses** = the original slot being vacated → `isOriginalSlot = true`.
- Range `"7 - 8"` → `periods: [7, 8]`.
- Row css class (`change`/`add`/`remove`) is a coarse hint only; real `kind` comes from `.info`.
- In the 2026-09-09 sample `isOriginalSlot` correlates **exactly** with `kind`:
  `true` ⟺ `cancelled | moved_out` (the slot is vacated), `false` ⟺
  `moved_in | added | substitution | room_change`. `resolve.ts` relies on the *kind*, not the
  parens, so a future divergence degrades gracefully rather than misplacing lessons.
- ⚠️ The "Skolotāji, kuri nepiedalās: …" (absent teachers) line is a bare
  `div[style="text-align:center"]`, **not** `.subst_note`, so it is not captured in `notes`.
  Add a selector for it if the UI ever wants to show it.

### `.info` grammar (Latvian — **locale-dependent**, `raw` is the only lossless field)

| Pattern in `.info` | `kind` | Extracted |
|---|---|---|
| `… , Atcelts` | `cancelled` | subject, teacher |
| `… , Moved to period: N` | `moved_out` | `movedToPeriod = N` |
| `Moved from period: N, Skolotājs: T` | `moved_in` | `movedFromPeriod = N`, teacher |
| `… , Moved to <Weekday> DD. MM.` | `moved_out` | `movedToDate` (cross-day move) |
| `Moved from <Weekday> DD. MM., Skolotājs: T` | `moved_in` | `movedFromDate`, teacher, room |
| `Aizvietošana: (T1) ➔ T2` | `substitution` | `teacherFrom = T1`, `teacher = T2` |
| `Kabineta nomaiņa: (R1) ➔ R2` | `room_change`¹ | `roomFrom = R1`, `room = R2` |
| `n: Subj - Added, Skolotājs: T, Kabinets: R` | `added` | `group = n`, teacher, room |
| leading `n: ` on subject | — | `group = n` |
| `(SubjA) ➔ SubjB - …` | — | `subjectFrom = SubjA`, `subject = SubjB` |

¹ only when no other change is present; otherwise it rides along on a `substitution`.

Arrow glyph is `➔` (U+2794).

### Known parser gaps (2026-09-09 sample: 55 rows, 0 × `other` after cross-day handling)
- `.subst_note` sentence-splitting is heuristic; a surname like `"N. Tiltiņš"` can split wrong.
  Treat notes as display-only free text.
- `other` rows: inspect `raw`, extend `parse_info` patterns as new phrasings show up.
- If the school switches UI language, every pattern above changes → re-derive from a fresh sample.

---

## 5. Merge → `ResolvedDay` (client side)

1. Take `Timetable.lessons` where `classIds ∋ classId` and `day == weekday(date)` and `weekMask` matches.
2. Index `DaySubstitutions.items` by `(className, group, period)`.
3. For each base lesson: apply `cancelled` / `substitution` / `room_change` / `moved_out`.
4. Append `moved_in` and `added` items as new `ResolvedLesson`s.
5. Keep `cancelled` lessons visible with `status: "cancelled"` (don't drop — users want to see it).
6. `changeNote` ← `Substitution.raw`; keep `original` teachers/rooms/period for a diff UI.

---

## 6. Refresh cadence (for later)

- `getTTViewerData` + `regularttGetData`: on app open + once/day. New `tt_num` appears ~weekly.
- `getSubstViewerDayDataHtml`: on app open and on pull-to-refresh, for today + next school day.
  This is the only thing that changes intraday.
- Be gentle: cache aggressively, custom `User-Agent`, no tight polling.
