# University timetables — RTU & LU source contract

Companion to `MODEL.md` (EduPage / RVT). This one covers the two universities Stundio also
reads: **Rīgas Tehniskā universitāte** (RTU) and **Latvijas Universitāte** (LU).
Verified 2026-10-12. Everything below is **public: no login, no cookies**.
Canonical types: [`src/lib/university/types.ts`](./src/lib/university/types.ts).
Fixtures: `data/rtu_*.json`, `data/rtu_index.html`, `data/lu_*.html`.

Neither origin sends `Access-Control-Allow-Origin`, so the web build reaches both through the
`/api-university/{rtu|lu}/…` Cloudflare Pages Function (`functions/api-university/`), just
as EduPage goes through `/api-edupage`. On Android, `CapacitorHttp` calls them directly.

The two sources look nothing like EduPage. There is no weekly base timetable plus a
substitution delta. Each source publishes **dated events**: one row per lesson on one
calendar day, with its own start and end time. So there are no period numbers, no buildings
list to choose from, and no substitution feed. A change simply *is* the new event (LU also
keeps cancelled rows, marked).

---

## 1. RTU — `https://nodarbibas.rtu.lv`

(`nodarbes.rtu.lv`, the older name, no longer resolves.)

Every data call is a `POST` with an `application/x-www-form-urlencoded` body, answering JSON.
The site's own `resources/assets/js/fullcalendar.js` drives exactly this chain:

| Step | Path | Form fields | Returns |
|---|---|---|---|
| Semesters | `/` (HTML) | — | `<select id="semester-id">` options; the `selected` one is current |
| Semester dates | `/getChousenSemesterStartEndDate` | `semesterId` | `{semesterId, titleLV, startDate, endDate, …}` (epoch ms) |
| Programs | `/findProgramsBySemesterId` | `semesterId` | `[{departmentId, titleLV, titleEN, code, program: [{programId, titleLV, titleEN, code}]}]` |
| Courses (years) | `/findCourseByProgramId` | `semesterId, programId` | `[1, 2, 3, 4]` |
| Groups | `/findGroupByCourseId` | `courseId, semesterId, programId` | `[{semesterProgramId, course, group, program}]` |
| Published? | `/isSemesterProgramPublished` | `semesterProgramId` | `true` / `false` |
| Subjects | `/getSemProgSubjects` | `semesterProgramId` | `[{subjectId, titleLV, titleEN, code, part}]` |
| **Events** | `/getSemesterProgEventList` | `semesterProgramId, year, month` | one calendar month of events, below |

**A group is a `semesterProgramId`.** It is unique across programs and courses, and it is
the only key the event list takes, so it is what Stundio stores as the group id.

Event row (`data/rtu_events_38532_2026-10.json`):

```json
{
  "eventDateId": 1740454, "eventId": 108536, "statusId": 1,
  "eventTempName": "Lekc. Ēku tipoloģija, U.Bratuškins",
  "roomInfoText": "Ķīp. 6-307", "lecturerInfoText": "U.Bratuškins",
  "room": { "roomId": 1996, "roomNumber": "307", "roomName": "Ķīpsalas 6 - 307" },
  "eventDate": 1790802000000,
  "customStart": { "hour": 12, "minute": 30 }, "customEnd": { "hour": 14, "minute": 5 }
}
```

- `eventDate` is **midnight Europe/Riga** in epoch ms. Read the calendar day in Riga time,
  never UTC: in UTC it is the evening before.
- `eventTempName` = `<kind>. <subject>, <lecturers>`. The kind may itself hold a comma
  (`"Lekc, Pr.d. Arhitektūras projektēšanas darbnīca I, I.Dirveiks, …"`), so the subject is
  found by (1) the longest `getSemProgSubjects` title the name contains, else (2) dropping
  everything up to the first `". "` in the first 16 characters and the trailing
  `", " + lecturerInfoText`.
- Lecturers are `lecturerInfoText` split on `", "`.
- Building = `room.roomName` before `" - "` (`"Ķīpsalas 6"`). Room label = `roomInfoText`.
- `statusId` is `1` for nearly every row. `3` appears on a few rows that look like ordinary
  lessons, and the official site renders every status identically. Its meaning is unknown, so
  Stundio does not treat it as a cancellation.
- `eventDateId + "_" + eventId` is the site's own unique event key.

## 2. LU — `https://lekciju-saraksts.lu.lv`

Server-rendered HTML, all `GET`.

| Purpose | Path | Notes |
|---|---|---|
| Catalogue | `/` | Faculty → program → group, as nested `<details>` |
| **Events** | `/grupa/{groupId}/hronologiski?datums_no=dd.mm.yyyy&datums_lidz=dd.mm.yyyy` | A chronological list. Every row carries its fields in `data-*` attributes |

Catalogue (`data/lu_index.html`):

- `<h1 class="page-heading">… <span class="heading-term">2026. gada rudens</span>`: the current semester.
- `<span class="dept-name">`: faculty, then per program `<span class="course-name">30617 Sociālās
  zinātnes [2026] <span class="course-level">Akadēmiskā doktora</span>`.
- Each group: `<a href="/grupa/26R-21023-PLK-1/nedela?auto=1" class="group-link">26R-21023 Fizika
  Akadēmiskā bakalaura,Pilna laika: klātiene,1-sem.</a>`. **The path segment is the group id.**

Event row (`data/lu_group_26R-21023-PLK-1_chrono.html`):

```html
<li class="event-row  past"
    data-module="Matemātiskā analīze I" data-module-code="MateB044"
    data-time="10:30" data-time2="12:00" data-date="01.09.2026"
    data-staff="Ingrīda Uļjane" data-room="OMEGA(106). auditorija (1. stāvs)"
    data-room-building="Jelgavas iela 3, Zinātņu māja"
    data-event-type="Lekcija | Lecture" data-state="Live"
    data-groups="26R-21023 Fizika …,1-sem.,MateB044, 26R-21023 Fizika …,1-sem.,fiziviens,MateB044">
```

- The subject is `data-module`. `data-title` gets a `"- Cancelled"` suffix on cancelled rows.
- `data-state` is `Live` or `Cancelled`. A cancelled row stays in place, and the
  replacement (if there is one) is a separate `Live` row at the same time.
- `data-staff`: lecturers, `", "`-separated.
- The group page also lists events of the group's **subgroups** ("child groups":
  `fiziviens`, `fizidivi`, …). `data-groups` is a `", "`-separated list of
  `<group label>,[<subgroup>,]<module code>`. The group label is the page's
  `<span class="gh-group-name">`. An entry for our label with a subgroup token marks a
  subgroup-only event. An entry without one marks a whole-group event.
- Attribute values are HTML-escaped (`&quot;`, `&amp;`, `&#x…;`).
- Without the date filter the page holds the whole semester (~700 KB), so Stundio asks for
  just the window it needs.

## 3. How Stundio maps them

Both sources normalise to one `UniversityEvent[]` per group (`lib/university/`). A day is
turned into the same `ResolvedDay` the EduPage path produces (`resolveUniversityDay`):
events sorted by start time, a synthetic period number (1, 2, …) per event, the event's
real `start`/`end`, the building from the room. Cancelled events stay visible with status
`"cancelled"`. So Home, Week, Subjects, the widget and the share card need no
university-specific code.

What does not exist for universities, and is therefore hidden or empty: substitutions and the
Changes tab's feed, building pinning, teacher mode, and RVT's school announcements.

## 4. Refresh policy

- Events: the sync window is the viewed week plus the next one (`universityWindow`). That is
  one LU request, or one or two RTU month requests. It is refetched when the cached window
  doesn't cover the request, when it is older than `UNIVERSITY_MAX_AGE_MS` (10 min), or on
  pull-to-refresh. Cached events outside the fetched window are kept, so weeks you already
  browsed stay available offline. Events older than 14 days are pruned.
- Catalogue (programs / groups): fetched live while picking, never cached. Picking a group
  needs a connection, just as picking an RVT class on first run does.
