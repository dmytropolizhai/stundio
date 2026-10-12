/**
 * LU — `lekciju-saraksts.lu.lv`. Parsing of its server-rendered pages, and the GETs that
 * fetch them. See MODEL-UNIVERSITY.md §2 for the markup.
 *
 * Pure and non-throwing like the RTU side: a row missing its date or times is dropped.
 */
import type { HttpClient, ISODate } from "@/lib/edupage";
import { attributesOf, textOf } from "./html.ts";
import { getHtml } from "./transport.ts";
import type { UniversityEvent, UniversityGroupRef, UniversityProgram } from "./types.ts";

/** A program with its groups — the LU front page lists both at once. */
export type LuProgram = UniversityProgram & { groups: UniversityGroupRef[] };

/** `"26R-21023 Fizika Akadēmiskā bakalaura,Pilna laika: klātiene,1-sem."` → `"26R-21023 · 1-sem."`. */
export const luGroupLabel = (text: string): string => {
  const code = /^\S+/.exec(text)?.[0] ?? text;
  const parts = text.split(",").map((p) => p.trim());
  const semester = parts.find((p) => /^\d+-sem\.?/.test(p));
  const mode = parts.length > 1 ? parts[1] : undefined;
  return [code, mode, semester].filter((p) => p !== undefined && p !== "").join(" · ");
};

export const parseLuCatalog = (html: string): LuProgram[] => {
  const programs: LuProgram[] = [];
  // Faculties open with `dept-name`; the HTML nests programs inside, so split on it.
  for (const dept of html.split('<span class="dept-name">').slice(1)) {
    const faculty = textOf(dept.slice(0, dept.indexOf("</span>")));
    for (const course of dept.split('<details class="course-details">').slice(1)) {
      const nameHtml = /<span class="course-name">([\s\S]*?)<\/summary>/.exec(course)?.[1] ?? "";
      const level = /<span class="course-level">([\s\S]*?)<\/span>/.exec(nameHtml)?.[1];
      // The program's own text is what precedes the first nested span or link.
      const head = textOf(nameHtml.split(/<span|<a/)[0] ?? "");
      const code = /^\S+/.exec(head)?.[0] ?? "";
      const title = head.slice(code.length).trim();
      if (code === "") continue;

      const groups: UniversityGroupRef[] = [];
      for (const link of course.matchAll(
        /<a href="\/grupa\/([^/"]+)\/[^"]*"[^>]*class="group-link"[^>]*>([\s\S]*?)<\/a>/g,
      )) {
        const id = decodeURIComponent(link[1] ?? "");
        // The child-group count `(2)` sits in its own span — not part of the name.
        const text = textOf(
          (link[2] ?? "").replace(/<span class="group-child-count">[\s\S]*?<\/span>/, ""),
        );
        if (id === "" || text === "") continue;
        groups.push({ university: "lu", id, label: luGroupLabel(text), program: title || head });
      }

      programs.push({
        university: "lu",
        id: code,
        code,
        title: title || head,
        faculty,
        level: level === undefined ? null : textOf(level),
        groups,
      });
    }
  }
  return programs;
};

const luDate = (ddmmyyyy: string): ISODate | null => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(ddmmyyyy.trim());
  return m === null ? null : `${m[3] ?? ""}-${m[2] ?? ""}-${m[1] ?? ""}`;
};

const luTime = (v: string | undefined): string | null => {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(v?.trim() ?? "");
  return m === null ? null : `${(m[1] ?? "").padStart(2, "0")}:${m[2] ?? ""}`;
};

/** The group's own label, which `data-groups` entries are prefixed with. */
export const parseLuGroupLabel = (html: string): string | null => {
  const m = /<span class="gh-val gh-group-name">([\s\S]*?)<\/span>/.exec(html);
  return m === null ? null : textOf(m[1] ?? "");
};

/**
 * Which child group an event is for. `data-groups` lists `<label>,[<subgroup>,]<module>`
 * entries; the event is the whole group's when any entry for our label has no subgroup.
 */
export const luSubgroupOf = (groups: string, label: string | null): string | null => {
  if (label === null) return null;
  const subgroups = new Set<string>();
  for (const entry of groups.split(", ")) {
    if (!entry.startsWith(`${label},`)) continue;
    const rest = entry.slice(label.length + 1).split(",");
    if (rest.length < 2) return null; // whole group
    const subgroup = rest[0]?.trim();
    if (subgroup !== undefined && subgroup !== "") subgroups.add(subgroup);
  }
  // Exactly one subgroup → it's theirs; several (every subgroup listed) means everyone.
  return subgroups.size === 1 ? ([...subgroups][0] ?? null) : null;
};

export const parseLuEvents = (html: string): UniversityEvent[] => {
  const label = parseLuGroupLabel(html);
  const events: UniversityEvent[] = [];
  for (const m of html.matchAll(/<li class="event-row[^"]*"([^>]*)>/g)) {
    const a = attributesOf(m[1] ?? "");
    const date = luDate(a["data-date"] ?? a["data-day"] ?? "");
    const start = luTime(a["data-time"]);
    const end = luTime(a["data-time2"]);
    const subject = a["data-module"] || a["data-title"] || "";
    if (date === null || start === null || end === null || subject === "") continue;

    const room = a["data-room"] || null;
    const code = a["data-module-code"] || null;
    events.push({
      // LU publishes no event id; this tuple is unique within a group's page.
      id: `${date}|${start}|${code ?? subject}|${room ?? ""}|${String(events.length)}`,
      date,
      start,
      end,
      subject,
      subjectCode: code,
      kind: a["data-event-type"] || null,
      lecturers: (a["data-staff"] ?? "")
        .split(", ")
        .map((s) => s.trim())
        .filter(Boolean),
      room,
      building: a["data-room-building"] || null,
      subgroup: luSubgroupOf(a["data-groups"] ?? "", label),
      cancelled: a["data-state"] === "Cancelled",
    });
  }
  return events;
};

const luQueryDate = (date: ISODate): string => {
  const [y, m, d] = date.split("-");
  return `${d ?? ""}.${m ?? ""}.${y ?? ""}`;
};

export const fetchLuCatalog = async (http: HttpClient): Promise<LuProgram[]> =>
  parseLuCatalog(await getHtml(http, "lu", "/"));

export const fetchLuEvents = async (
  http: HttpClient,
  groupId: string,
  from: ISODate,
  to: ISODate,
): Promise<UniversityEvent[]> => {
  const query = `datums_no=${luQueryDate(from)}&datums_lidz=${luQueryDate(to)}`;
  const html = await getHtml(
    http,
    "lu",
    `/grupa/${encodeURIComponent(groupId)}/hronologiski?${query}`,
  );
  return parseLuEvents(html).filter((e) => e.date >= from && e.date <= to);
};
