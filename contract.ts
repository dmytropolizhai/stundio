/**
 * EduPage timetable — data contract between scraper and UI.
 *
 * Verified against https://pikcrvt.edupage.org (Rīgas Valsts tehnikums), 2026-09-09.
 * All source endpoints are PUBLIC (no login, __gsh "00000000"). See MODEL.md for
 * endpoint payloads and parsing rules.
 *
 * Layering:
 *   Timetable          static weekly base  (regularttGetData, one per building+week)
 *   DaySubstitutions   per-day delta       (getSubstViewerDayDataHtml, parsed from HTML)
 *   ResolvedDay        UI view model = base for that weekday with the delta applied
 *
 * IDs are the raw EduPage strings ("-927", "*1"); never assume they are numeric.
 */

export type ISODate = string; // "2026-09-09"
export type ISODateTime = string; // "2026-09-09T07:12:34.000Z"
export type HHMM = string; // "08:30"
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/* ------------------------------------------------------------------ *
 * Entity references (from regularttGetData tables)
 * ------------------------------------------------------------------ */

export type EntityRef = {
  id: string;
  name: string; // full name
  short: string; // display label used across the app
  color?: string | null; // "#14C030"; only classes/subjects/teachers carry one
};

export type ClassRef = EntityRef;
export type SubjectRef = EntityRef;
export type TeacherRef = EntityRef; // NOTE: RVT populates only `short` ("Surname Name")
export type RoomRef = Omit<EntityRef, "color">;

export type Period = {
  period: string; // "0".."12" — the source key, kept as string
  name: string; // usually same as period
  start: HHMM;
  end: HHMM;
};

/* ------------------------------------------------------------------ *
 * Static weekly timetable
 * ------------------------------------------------------------------ */

export type Building = "TIC" | "Galvenā ēka" | (string & {}); // annex | main | future

export type TimetableMeta = {
  ttNum: string; // "1175" — the regularttGetData id
  building: Building; // parsed from the ttviewer `text` field
  validFrom: ISODate; // ttviewer `datefrom`; a NEW ttNum is published every week
  validTo?: ISODate; // parsed from `text` range when present
  label: string; // raw ttviewer `text`
  schoolYear: number; // 2026
  fetchedAt: ISODateTime; // scraper-set
};

/** One placed lesson slot (one source `card`, class-expanded). */
export type Lesson = {
  id: string; // source card id, e.g. "*1"
  classIds: string[]; // resolved: direct lesson.classids + groups[].classid via groupids
  groups: string[]; // division labels, e.g. ["2"] for a split class; [] = whole class
  subjectId: string;
  teacherIds: string[];
  roomIds: string[];
  day: Weekday;
  period: string; // starting period key (matches Period.period)
  periodSpan: number; // source `durationperiods`, >= 1
  weekMask: string; // A/B-week bitmask, "1" = every week (RVT currently always "1")
  termMask: string; // term bitmask, "1" here
};

export type Timetable = {
  meta: TimetableMeta;
  periods: Period[];
  classes: ClassRef[];
  teachers: TeacherRef[];
  subjects: SubjectRef[];
  rooms: RoomRef[];
  lessons: Lesson[];
};

/* ------------------------------------------------------------------ *
 * Per-day substitutions (parsed from getSubstViewerDayDataHtml)
 * ------------------------------------------------------------------ */

export type SubstKind =
  | "cancelled" // lesson dropped ("Atcelts")
  | "moved_out" // this slot emptied, lesson moved elsewhere ("Moved to period: N")
  | "moved_in" // lesson relocated into this slot ("Moved from period: N")
  | "substitution" // teacher and/or subject swapped ("Aizvietošana: (A) ➔ B")
  | "room_change" // only the room changed ("Kabineta nomaiņa: (A) ➔ B")
  | "added" // extra lesson inserted ("Added")
  | "other"; // parser fell through — read `raw`

export type Substitution = {
  date: ISODate;
  className: string; // matches ClassRef.short
  group: string | null; // "2" for "2: Vācu valoda"; null = whole class
  periods: number[]; // [1] or expanded range [7, 8]
  isOriginalSlot: boolean; // source period was "(N)" — the slot being vacated
  kind: SubstKind;
  subject: string | null;
  subjectFrom: string | null; // for "(Old subj) ➔ New subj"
  teacher: string | null;
  teacherFrom: string | null;
  room: string | null;
  roomFrom: string | null;
  movedFromPeriod: number | null;
  movedToPeriod: number | null;
  movedFromDate: ISODate | null; // cross-day move: "Moved from Pirmdiena 07. 09."
  movedToDate: ISODate | null; // cross-day move: "Moved to Piektdiena 11. 09."
  raw: string; // full localized .info text — ALWAYS kept; the only lossless field
};

export type DaySubstitutions = {
  date: ISODate;
  mode: "classes"; // "teachers" | "classrooms" also valid at the endpoint
  notes: string[]; // free-text announcements from .subst_note (best-effort split)
  items: Substitution[];
  fetchedAt: ISODateTime;
};

/* ------------------------------------------------------------------ *
 * Resolved view model — what the UI renders for one class on one date
 * (client-side merge of Timetable + DaySubstitutions; not a source shape)
 * ------------------------------------------------------------------ */

export type ResolvedStatus = "normal" | "cancelled" | "moved" | "substituted" | "room_change" | "added";

export type ResolvedLesson = {
  period: string;
  start: HHMM;
  end: HHMM;
  span: number;
  subject: SubjectRef | null;
  teachers: TeacherRef[];
  rooms: RoomRef[];
  group: string | null;
  status: ResolvedStatus;
  changeNote: string | null; // human summary when status !== "normal" (from Substitution.raw)
  original?: { teachers?: TeacherRef[]; rooms?: RoomRef[]; period?: string } | null;
};

export type ResolvedDay = {
  date: ISODate;
  weekday: Weekday;
  classId: string;
  building: Building;
  ttNum: string; // base timetable used
  lessons: ResolvedLesson[]; // sorted by period; cancelled kept with status "cancelled"
  notes: string[]; // pass-through of DaySubstitutions.notes
  stale: boolean; // true if base ttNum.validFrom week != date's week
};

/* ------------------------------------------------------------------ *
 * Scraper output bundle (what the local store / API caches)
 * ------------------------------------------------------------------ */

export type Snapshot = {
  school: string; // "pikcrvt"
  schoolName: string; // "Rīgas Valsts tehnikums"
  timezone: string; // "Europe/Riga"
  fetchedAt: ISODateTime;
  timetables: Timetable[]; // one per (building, week); pick by date + building
  substitutions: DaySubstitutions[]; // one per fetched date
};
