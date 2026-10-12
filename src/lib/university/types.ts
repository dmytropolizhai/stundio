/**
 * University timetables — the data contract between the RTU / LU scrapers and the app.
 *
 * Verified against https://nodarbibas.rtu.lv and https://lekciju-saraksts.lu.lv, 2026-10-12.
 * Both are public. See MODEL-UNIVERSITY.md for the endpoints and the parsing rules.
 *
 * Unlike EduPage there is no weekly base + daily delta: each source publishes dated events,
 * one per lesson per calendar day. Everything normalises to `UniversityEvent`, and a day of
 * them resolves into the same `ResolvedDay` the EduPage path produces (`resolve.ts`).
 */
import type { HHMM, ISODate, ISODateTime } from "@/lib/edupage";

export const UNIVERSITIES = ["rtu", "lu"] as const;
export type UniversityId = (typeof UNIVERSITIES)[number];

/** A study group the user can pick — what Settings stores, so the label survives offline. */
export type UniversityGroupRef = {
  university: UniversityId;
  /** RTU: the `semesterProgramId`. LU: the path segment, e.g. "26R-21023-PLK-1". */
  id: string;
  /** Short display label: "RABA0 · 1. kurss · 1. grupa", "26R-21023 · 1-sem.". */
  label: string;
  /** The study program's name, as the source writes it. */
  program: string;
};

/** One study program in a university's catalogue — the first level of the group picker. */
export type UniversityProgram = {
  university: UniversityId;
  id: string;
  code: string;
  title: string;
  /** Faculty / institute, as the source writes it. */
  faculty: string;
  /** Degree level ("Akadēmiskā bakalaura"), when the source says. */
  level: string | null;
};

export type UniversityEvent = {
  /** Unique within its source. */
  id: string;
  date: ISODate;
  start: HHMM;
  end: HHMM;
  /** The subject's name, verbatim from the source (school text — never translated). */
  subject: string;
  subjectCode: string | null;
  /** "Lekc." / "Lekcija | Lecture" — verbatim, display-only. */
  kind: string | null;
  lecturers: string[];
  room: string | null;
  building: string | null;
  /** An LU child group this event is limited to; `null` = the whole group. */
  subgroup: string | null;
  cancelled: boolean;
};

/** The cached events of one group — what `db` stores and `sync` refreshes. */
export type UniversitySchedule = {
  university: UniversityId;
  groupId: string;
  /** Sorted by date, then start. */
  events: UniversityEvent[];
  /** Date ranges fetched so far, inclusive; events outside them are simply unknown. */
  covered: { from: ISODate; to: ISODate }[];
  fetchedAt: ISODateTime;
};

export const UNIVERSITY_NAMES: Record<UniversityId, string> = {
  rtu: "Rīgas Tehniskā universitāte",
  lu: "Latvijas Universitāte",
};

export const UNIVERSITY_SHORT: Record<UniversityId, string> = {
  rtu: "RTU",
  lu: "LU",
};
