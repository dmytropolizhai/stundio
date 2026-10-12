/**
 * RTU — `nodarbibas.rtu.lv`. Parsing of its JSON endpoints, and the calls that fetch them.
 * See MODEL-UNIVERSITY.md §1 for the endpoint chain and the event-name grammar.
 *
 * Parsers are pure and never throw on odd rows: a row missing a field is dropped, not the
 * whole response. Only `fetch*` touch the network, all through `postForm` / `getHtml`.
 */
import type { HttpClient, ISODate } from "@/lib/edupage";
import { attributesOf, textOf } from "./html.ts";
import { getHtml, postForm, UniversityError } from "./transport.ts";
import type { UniversityEvent, UniversityGroupRef, UniversityProgram } from "./types.ts";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const pad = (n: number): string => String(n).padStart(2, "0");

/* ------------------------------------------------------------------ *
 * Catalogue
 * ------------------------------------------------------------------ */

export type RtuSemester = { id: string; label: string; current: boolean };

/** The semester `<select>` on the front page — RTU has no JSON for this list. */
export const parseRtuSemesters = (html: string): RtuSemester[] => {
  const select = /<select[^>]*id="semester-id"[^>]*>([\s\S]*?)<\/select>/.exec(html)?.[1] ?? "";
  return [...select.matchAll(/<option([^>]*)>([\s\S]*?)<\/option>/g)].flatMap((m) => {
    const attrs = attributesOf(m[1] ?? "");
    const id = attrs["value"];
    if (id === undefined || id === "") return [];
    return [{ id, label: textOf(m[2] ?? ""), current: "selected" in attrs }];
  });
};

/** The semester to read: the one the site preselects, else the first listed. */
export const currentRtuSemester = (semesters: readonly RtuSemester[]): RtuSemester | null =>
  semesters.find((s) => s.current) ?? semesters[0] ?? null;

export const parseRtuPrograms = (data: unknown): UniversityProgram[] => {
  if (!Array.isArray(data)) return [];
  return data.flatMap((department) => {
    if (!isRecord(department) || !Array.isArray(department["program"])) return [];
    const faculty = str(department["titleLV"]) ?? "";
    const facultyEn = str(department["titleEN"]);
    return department["program"].flatMap((program): UniversityProgram[] => {
      if (!isRecord(program)) return [];
      const id = num(program["programId"]);
      const title = str(program["titleLV"]);
      if (id === null || title === null) return [];
      return [
        {
          university: "rtu",
          id: String(id),
          code: str(program["code"]) ?? "",
          title,
          faculty,
          level: null,
          titleEn: str(program["titleEN"]),
          facultyEn,
          levelEn: null,
        },
      ];
    });
  });
};

export const parseRtuCourses = (data: unknown): number[] =>
  Array.isArray(data) ? data.filter((c): c is number => num(c) !== null) : [];

/** The display label of an RTU group: program code, course (year) and group number. */
export const rtuGroupLabel = (code: string, course: number, group: string): string =>
  [code, `${String(course)}. k.`, `${group}. gr.`].filter((p) => p !== "").join(" · ");

export const parseRtuGroups = (data: unknown, program: UniversityProgram): UniversityGroupRef[] => {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row): UniversityGroupRef[] => {
    if (!isRecord(row)) return [];
    const id = num(row["semesterProgramId"]);
    const course = num(row["course"]);
    const group = str(row["group"]) ?? (num(row["group"]) === null ? null : String(row["group"]));
    if (id === null || course === null || group === null) return [];
    return [
      {
        university: "rtu",
        id: String(id),
        label: rtuGroupLabel(program.code, course, group),
        program: program.title,
        programEn: program.titleEn,
        course,
        number: group,
      },
    ];
  });
};

export type RtuSubject = { title: string; titleEn: string | null; code: string | null };

/** One group's subjects, for pulling the subject — and its code and English name — out of an event. */
export const parseRtuSubjects = (data: unknown): RtuSubject[] =>
  Array.isArray(data)
    ? data.flatMap((s): RtuSubject[] => {
        if (!isRecord(s)) return [];
        const title = str(s["titleLV"]);
        return title === null ? [] : [{ title, titleEn: str(s["titleEN"]), code: str(s["code"]) }];
      })
    : [];

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

const rigaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Riga",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `eventDate` is midnight Riga as epoch ms — in UTC it is the evening before. */
export const rtuEventDate = (epochMs: number): ISODate => rigaDate.format(new Date(epochMs));

const hhmm = (v: unknown): string | null => {
  if (!isRecord(v)) return null;
  const hour = num(v["hour"]);
  const minute = num(v["minute"]);
  return hour === null || minute === null ? null : `${pad(hour)}:${pad(minute)}`;
};

/**
 * `"Lekc, Pr.d. Arhitektūras projektēšanas darbnīca I, I.Dirveiks, A.Koroļova"` →
 * kind `"Lekc, Pr.d."`, subject `"Arhitektūras projektēšanas darbnīca I"`. The group's own
 * subject list wins when one of its titles appears in the name; the kind prefix ends at the
 * first `". "` near the start, and the lecturers are a known suffix.
 */
export const splitRtuEventName = (
  name: string,
  lecturers: string | null,
  subjects: readonly string[],
): { kind: string | null; subject: string } => {
  const dot = name.indexOf(". ");
  const kind = dot > 0 && dot <= 16 ? name.slice(0, dot + 1) : null;

  const known = subjects.filter((s) => name.includes(s)).sort((a, b) => b.length - a.length)[0];
  if (known !== undefined) return { kind, subject: known };

  let subject = kind === null ? name : name.slice(kind.length).trimStart();
  if (lecturers !== null && subject.endsWith(`, ${lecturers}`)) {
    subject = subject.slice(0, -(lecturers.length + 2));
  }
  return { kind, subject: subject.trim() === "" ? name : subject.trim() };
};

export const parseRtuEvents = (
  data: unknown,
  subjects: readonly RtuSubject[],
): UniversityEvent[] => {
  const titles = subjects.map((s) => s.title);
  const titlesEn = subjects.flatMap((s) => (s.titleEn === null ? [] : [s.titleEn]));
  if (!Array.isArray(data)) return [];
  return data.flatMap((row): UniversityEvent[] => {
    if (!isRecord(row)) return [];
    const name = str(row["eventTempName"]);
    const epoch = num(row["eventDate"]);
    const start = hhmm(row["customStart"]);
    const end = hhmm(row["customEnd"]);
    if (name === null || epoch === null || start === null || end === null) return [];

    const lecturerText = str(row["lecturerInfoText"]);
    const { kind, subject } = splitRtuEventName(name, lecturerText, titles);
    const known = subjects.find((s) => s.title === subject);
    const nameEn = str(row["eventTempNameEn"]);
    const english =
      nameEn === null ? null : splitRtuEventName(nameEn, str(row["lecturerInfoTextEn"]), titlesEn);
    // The group's own English title first; else the English event name, split the same way.
    const subjectEn =
      known?.titleEn ?? (english !== null && english.subject !== subject ? english.subject : null);
    const room = isRecord(row["room"]) ? row["room"] : null;
    const roomName = room === null ? null : str(room["roomName"]);
    const separator = roomName?.indexOf(" - ") ?? -1;

    return [
      {
        id: `${String(row["eventDateId"])}_${String(row["eventId"])}`,
        date: rtuEventDate(epoch),
        start,
        end,
        subject,
        subjectEn,
        subjectCode: known?.code ?? null,
        kind,
        kindEn: english?.kind ?? null,
        lecturers:
          lecturerText === null
            ? []
            : lecturerText
                .split(", ")
                .map((l) => l.trim())
                .filter(Boolean),
        room: str(row["roomInfoText"]) ?? roomName,
        building: roomName !== null && separator > 0 ? roomName.slice(0, separator) : null,
        subgroup: null,
        // `statusId` 3 rows look like ordinary lessons and the site renders them as such;
        // its meaning is unknown (MODEL-UNIVERSITY.md §1), so it is not read as cancelled.
        cancelled: false,
      },
    ];
  });
};

/* ------------------------------------------------------------------ *
 * Network
 * ------------------------------------------------------------------ */

export const fetchRtuCurrentSemester = async (http: HttpClient): Promise<RtuSemester> => {
  const semester = currentRtuSemester(parseRtuSemesters(await getHtml(http, "rtu", "/")));
  if (semester === null) throw new UniversityError("rtu: no semester listed");
  return semester;
};

export const fetchRtuPrograms = async (
  http: HttpClient,
  semesterId: string,
): Promise<UniversityProgram[]> =>
  parseRtuPrograms(await postForm(http, "rtu", "/findProgramsBySemesterId", { semesterId }));

/** Every group of a program: one call for its courses, then one per course. */
export const fetchRtuGroups = async (
  http: HttpClient,
  semesterId: string,
  program: UniversityProgram,
): Promise<UniversityGroupRef[]> => {
  const courses = parseRtuCourses(
    await postForm(http, "rtu", "/findCourseByProgramId", { semesterId, programId: program.id }),
  );
  const groups: UniversityGroupRef[] = [];
  // Sequential: a handful of tiny calls, and we are not hammering the university either.
  for (const course of courses) {
    const data = await postForm(http, "rtu", "/findGroupByCourseId", {
      courseId: String(course),
      semesterId,
      programId: program.id,
    });
    groups.push(...parseRtuGroups(data, program));
  }
  return groups;
};

/** The months (`[year, month]`, 1-based) a date range touches. */
export const monthsBetween = (from: ISODate, to: ISODate): [number, number][] => {
  const months: [number, number][] = [];
  let [y, m] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  while (y < ty || (y === ty && m <= tm)) {
    months.push([y, m]);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
};

export const fetchRtuEvents = async (
  http: HttpClient,
  groupId: string,
  from: ISODate,
  to: ISODate,
): Promise<UniversityEvent[]> => {
  const subjects = parseRtuSubjects(
    await postForm(http, "rtu", "/getSemProgSubjects", { semesterProgramId: groupId }),
  );
  const events: UniversityEvent[] = [];
  for (const [year, month] of monthsBetween(from, to)) {
    const data = await postForm(http, "rtu", "/getSemesterProgEventList", {
      semesterProgramId: groupId,
      year: String(year),
      month: String(month),
    });
    events.push(...parseRtuEvents(data, subjects));
  }
  return events.filter((e) => e.date >= from && e.date <= to);
};
