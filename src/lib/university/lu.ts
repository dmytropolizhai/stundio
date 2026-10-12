/**
 * LU — `lekciju-saraksts.lu.lv`. Parsing of its server-rendered pages, and the GETs that
 * fetch them. See MODEL-UNIVERSITY.md §2 for the markup.
 *
 * Pure and non-throwing like the RTU side: a row missing its date or times is dropped.
 */
import type { HttpClient, ISODate } from "@/lib/edupage";
import { attributesOf, textOf } from "./html.ts";
import { getHtml, universityBaseUrl, UniversityError } from "./transport.ts";
import type { UniversityEvent, UniversityGroupRef, UniversityProgram } from "./types.ts";

/** A program with its groups — the LU front page lists both at once. */
export type LuProgram = UniversityProgram & { groups: UniversityGroupRef[] };

/** "1-sem." (until 2026-10-12) or "1. sem." (since) — LU reformats its labels without notice. */
const SEMESTER = /^\d+\.?\s*-?\s*sem\.?$/;

/**
 * `"26R-21023 Fizika Akadēmiskā bakalaura, Pilna laika: klātiene, 1. sem."` →
 * `"26R-21023 · Pilna laika: klātiene · 1. sem."`. Splits on bare commas, so both the old
 * `","` and the current `", "` separators read the same.
 */
export const luGroupLabel = (text: string): string => {
  const code = /^\S+/.exec(text)?.[0] ?? text;
  const parts = text.split(",").map((p) => p.trim());
  const semester = parts.find((p) => SEMESTER.test(p));
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
        titleEn: null,
        facultyEn: null,
        levelEn: null,
        groups,
      });
    }
  }
  return programs;
};

/**
 * Folds the English front page's names into the Latvian catalogue. Both list the same programs
 * and groups in the same order; where a program has no English name, LU repeats the Latvian
 * one, which is left out here rather than shown twice.
 */
export const mergeLuEnglish = (lv: LuProgram[], en: LuProgram[]): LuProgram[] => {
  const byCode = new Map<string, LuProgram[]>();
  for (const p of en) byCode.set(p.code, [...(byCode.get(p.code) ?? []), p]);
  const seen = new Map<string, number>();
  return lv.map((program) => {
    const nth = seen.get(program.code) ?? 0;
    seen.set(program.code, nth + 1);
    const english = byCode.get(program.code)?.[nth];
    if (english === undefined) return program;
    const differs = (a: string | null, b: string | null) => (b !== null && b !== a ? b : null);
    const titleEn = differs(program.title, english.title);
    return {
      ...program,
      titleEn,
      facultyEn: differs(program.faculty, english.faculty),
      levelEn: differs(program.level, english.level),
      groups: program.groups.map((g) => ({ ...g, programEn: titleEn })),
    };
  });
};

const luDate = (ddmmyyyy: string): ISODate | null => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(ddmmyyyy.trim());
  return m === null ? null : `${m[3] ?? ""}-${m[2] ?? ""}-${m[1] ?? ""}`;
};

const luTime = (v: string | undefined): string | null => {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(v?.trim() ?? "");
  return m === null ? null : `${(m[1] ?? "").padStart(2, "0")}:${m[2] ?? ""}`;
};

/**
 * The group's own label, which `data-groups` entries start with. Since 2026-10-12 the heading
 * carries a `--full` and a `--short` variant; the full one is the label.
 */
export const parseLuGroupLabel = (html: string): string | null => {
  const m =
    /<span class="gh-val gh-group-name gh-group-name--full">([\s\S]*?)<\/span>/.exec(html) ??
    /<span class="gh-val gh-group-name">([\s\S]*?)<\/span>/.exec(html);
  return m === null ? null : textOf(m[1] ?? "");
};

/**
 * Which child group an event is for. `data-groups` lists `<label>,[<subgroup>,]<module code>`
 * entries. LU has written them joined by `", "` with bare `","` inside (until 2026-10-12) and
 * by `"; "` with `", "` inside (since). The label is known and every entry ends with the event's module code, so the
 * entries are cut at that code instead of at commas. An entry for our label without a subgroup
 * means the whole group; one subgroup means it is theirs alone; several (every subgroup listed)
 * means everyone.
 */
export const luSubgroupOf = (
  groups: string,
  label: string | null,
  moduleCode: string | null,
): string | null => {
  if (label === null || moduleCode === null || moduleCode === "") return null;
  const subgroups = new Set<string>();
  for (const raw of groups.split(moduleCode)) {
    const entry = raw.replace(/^[\s,;]+/, "");
    if (!entry.startsWith(label)) continue;
    const subgroup = entry.slice(label.length).replace(/^[\s,;]+|[\s,;]+$/g, "");
    if (subgroup === "") return null; // whole group
    subgroups.add(subgroup);
  }
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
    // LU repeats the Latvian name here when a module has no English one.
    const english = a["data-module-en"] || a["data-title-en"] || null;
    events.push({
      // LU publishes no event id; this tuple is unique within a group's page.
      id: `${date}|${start}|${code ?? subject}|${room ?? ""}|${String(events.length)}`,
      date,
      start,
      end,
      subject,
      subjectEn: english !== null && english !== subject ? english : null,
      subjectCode: code,
      kind: a["data-event-type"] || null,
      kindEn: null,
      lecturers: (a["data-staff"] ?? "")
        .split(", ")
        .map((s) => s.trim())
        .filter(Boolean),
      room,
      building: a["data-room-building"] || null,
      subgroup: luSubgroupOf(a["data-groups"] ?? "", label, code),
      cancelled: a["data-state"] === "Cancelled",
    });
  }
  return events;
};

const luQueryDate = (date: ISODate): string => {
  const [y, m, d] = date.split("-");
  return `${d ?? ""}.${m ?? ""}.${y ?? ""}`;
};

/**
 * LU keeps the interface language in its signed `session` cookie, set by `GET /lang/en`
 * (MODEL-UNIVERSITY.md §2). In a browser the cookie can be neither read nor sent, so the
 * `/api-university` proxy does the round trip itself when asked with `X-University-Lang`; on
 * device the client does it, with the redirect left unfollowed so its `Set-Cookie` is visible.
 */
const englishHeaders = async (http: HttpClient): Promise<Record<string, string>> => {
  if (universityBaseUrl("lu").startsWith("/")) return { "X-University-Lang": "en" };
  const res = await http({
    url: `${universityBaseUrl("lu")}/lang/en`,
    method: "GET",
    followRedirects: false,
  });
  const header = Object.entries(res.headers ?? {}).find(([k]) => k.toLowerCase() === "set-cookie");
  const session = /session=([^;,\s]+)/.exec(header?.[1] ?? "")?.[1];
  if (session === undefined) throw new UniversityError("lu: no English session", res.status);
  return { Cookie: `session=${session}` };
};

/**
 * The catalogue, with the English names folded in when `english` is set. An English page that
 * fails to load leaves the Latvian catalogue as it is — names are a nicety, the groups are not.
 */
export const fetchLuCatalog = async (http: HttpClient, english = false): Promise<LuProgram[]> => {
  const lv = parseLuCatalog(await getHtml(http, "lu", "/"));
  if (!english) return lv;
  try {
    const headers = await englishHeaders(http);
    return mergeLuEnglish(lv, parseLuCatalog(await getHtml(http, "lu", "/", headers)));
  } catch {
    return lv;
  }
};

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
