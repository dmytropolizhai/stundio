import { describe, expect, it } from "vitest";
import {
  fetchLuEvents,
  luGroupLabel,
  fetchLuCatalog,
  luSubgroupOf,
  mergeLuEnglish,
  parseLuCatalog,
  parseLuEvents,
  parseLuGroupLabel,
} from "../lu.ts";
import { createFakeUniversity, LU, LU_EN_SESSION, readFixture } from "./fixtures.ts";

const LABEL = "26R-21023 Fizika Akadēmiskā bakalaura, Pilna laika: klātiene, 1. sem.";
const LABEL_V1 = "26R-21023 Fizika Akadēmiskā bakalaura,Pilna laika: klātiene,1-sem.";

describe("LU catalogue", () => {
  const programs = parseLuCatalog(readFixture(LU.index));

  it("reads faculties, programs and their groups", () => {
    expect(programs.length).toBeGreaterThan(100);
    const doctoral = programs[0];
    expect(doctoral).toMatchObject({
      university: "lu",
      code: "30617",
      title: "Sociālās zinātnes [2026] Akadēmiskā doktora",
      faculty: "Ekonomikas un sociālo zinātņu fakultāte",
      level: null,
      titleEn: null,
    });
    expect(doctoral?.groups).toEqual([
      {
        university: "lu",
        id: "26R-30617-PLK-1",
        label: "26R-30617 · Pilna laika: klātiene · 1. sem.",
        program: "Sociālās zinātnes [2026] Akadēmiskā doktora",
      },
    ]);
    const library = programs.find((p) => p.code === "29611");
    expect(library?.level).toBe("Akadēmiskā maģistra");
    expect(library?.title).toBe("Bibliotēkzinātne un informācija");
    expect(library?.groups.map((g) => g.id)).toEqual(["26R-29611-PLK-1", "26R-29611-PLK-3"]);
  });

  it("keeps the child-group count out of a group's name", () => {
    const business = programs.find((p) => p.code === "207B7");
    expect(business?.groups[0]?.label).toBe("26R-207B7 · Nepilna laika: klātiene · 1. sem.");
  });

  it("labels groups the same in the old and the current markup", () => {
    expect(luGroupLabel(LABEL_V1)).toBe("26R-21023 · Pilna laika: klātiene · 1-sem.");
    expect(luGroupLabel(LABEL)).toBe("26R-21023 · Pilna laika: klātiene · 1. sem.");
  });

  it("finds the physics group whose fixture we hold", () => {
    const physics = programs.flatMap((p) => p.groups).find((g) => g.id === "26R-21023-PLK-1");
    expect(physics?.program).toBe("Fizika");
  });

  it("returns nothing for a page without the catalogue", () => {
    expect(parseLuCatalog("<html></html>")).toEqual([]);
    expect(luGroupLabel("X")).toBe("X");
  });
});

describe("LU English names", () => {
  const lv = parseLuCatalog(readFixture(LU.index));
  const merged = mergeLuEnglish(lv, parseLuCatalog(readFixture(LU.indexEn)));

  it("folds the English page's names into the same programs and groups", () => {
    expect(merged.map((p) => p.code)).toEqual(lv.map((p) => p.code));
    const library = merged.find((p) => p.code === "29611");
    expect(library).toMatchObject({
      title: "Bibliotēkzinātne un informācija",
      titleEn: "Library Science and Information",
      levelEn: "Master's Degree",
      facultyEn: "Faculty of Economics and Social Sciences",
    });
    expect(library?.groups[0]?.programEn).toBe("Library Science and Information");
  });

  it("leaves out an English name that only repeats the Latvian one", () => {
    expect(merged.find((p) => p.code === "30617")?.titleEn).toBeNull();
  });

  it("keeps a program the English page lacks as it is", () => {
    const [first] = lv;
    if (first === undefined) throw new Error("no program");
    expect(mergeLuEnglish([first], [])).toEqual([first]);
  });

  it("fetches the English page with LU's language session", async () => {
    const fake = createFakeUniversity();
    const programs = await fetchLuCatalog(fake.http, true);
    expect(fake.requests.map((r) => new URL(r.url).pathname)).toEqual(["/", "/lang/en", "/"]);
    expect(fake.requests[1]?.followRedirects).toBe(false);
    expect(fake.requests[2]?.headers?.["Cookie"]).toBe(`session=${LU_EN_SESSION}`);
    expect(programs.find((p) => p.code === "29611")?.titleEn).toBe(
      "Library Science and Information",
    );
  });

  it("falls back to Latvian when the English session cannot be had", async () => {
    const fake = createFakeUniversity();
    const http = fake.http;
    fake.http = (req) =>
      new URL(req.url).pathname === "/lang/en"
        ? Promise.resolve({ status: 302, data: "" })
        : http(req);
    const programs = await fetchLuCatalog(fake.http, true);
    expect(programs.every((p) => p.titleEn === null)).toBe(true);
  });

  it("reads Latvian only unless asked", async () => {
    const fake = createFakeUniversity();
    await fetchLuCatalog(fake.http);
    expect(fake.requests).toHaveLength(1);
  });
});

describe("LU events", () => {
  const html = readFixture(LU.chrono);
  const events = parseLuEvents(html);

  it("reads the group label the data-groups entries are keyed by", () => {
    expect(parseLuGroupLabel(html)).toBe(LABEL);
    expect(parseLuGroupLabel(readFixture(LU.chronoV1))).toBe(LABEL_V1);
    expect(parseLuGroupLabel("<p></p>")).toBeNull();
  });

  it("carries LU's English module names, not a Latvian repeat", () => {
    expect(events.find((e) => e.subject === "Fizika I")?.subjectEn).toBe("Physics I");
    expect(events.find((e) => e.subject === "Matemātiskā analīze I")?.subjectEn).toBeNull();
  });

  it("reads the old markup's events and subgroups the same", () => {
    const old = parseLuEvents(readFixture(LU.chronoV1));
    expect(old).toHaveLength(63);
    const subgroups = new Set(old.flatMap((e) => (e.subgroup === null ? [] : [e.subgroup])));
    expect([...subgroups].sort()).toEqual(["fizicetri", "fizidivi", "fizitris", "fiziviens"]);
  });

  it("parses every row of the window", () => {
    expect(events).toHaveLength(63);
    expect(events[0]).toMatchObject({
      date: "2026-09-28",
      subjectCode: expect.any(String) as string,
      building: "Jelgavas iela 3, Zinātņu māja",
    });
    expect(events.every((e) => /^\d{2}:\d{2}$/.test(e.start) && e.end > e.start)).toBe(true);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it("keeps cancelled rows, named by their module rather than the suffixed title", () => {
    const cancelled = events.filter((e) => e.cancelled);
    expect(cancelled).toHaveLength(2);
    expect(cancelled[0]).toMatchObject({
      date: "2026-10-23",
      start: "12:30",
      end: "14:00",
      subject: "Ievads matematikā fiziķiem",
      lecturers: ["Jānis Cīmurs"],
    });
  });

  it("marks subgroup-only events with their child group", () => {
    const subgroups = new Set(events.flatMap((e) => (e.subgroup === null ? [] : [e.subgroup])));
    expect([...subgroups].sort()).toEqual(["fizicetri", "fizidivi", "fizitris", "fiziviens"]);
    expect(events.some((e) => e.subgroup === null)).toBe(true);
  });

  it("decides the subgroup from data-groups, in either separator style", () => {
    const whole = `${LABEL}, MateB044; ${LABEL}, fiziviens, MateB044; ${LABEL}, fizidivi, MateB044`;
    expect(luSubgroupOf(whole, LABEL, "MateB044")).toBeNull();
    expect(luSubgroupOf(`${LABEL}, fiziviens, FiziB011`, LABEL, "FiziB011")).toBe("fiziviens");
    expect(luSubgroupOf(`${LABEL_V1},fiziviens,FiziB011`, LABEL_V1, "FiziB011")).toBe("fiziviens");
    const v1Whole = `${LABEL_V1},MateB044, ${LABEL_V1},fiziviens,MateB044`;
    expect(luSubgroupOf(v1Whole, LABEL_V1, "MateB044")).toBeNull();
    expect(luSubgroupOf(`${LABEL}, a, X; ${LABEL}, b, X`, LABEL, "X")).toBeNull();
    expect(luSubgroupOf("Other, a, X", LABEL, "X")).toBeNull();
    expect(luSubgroupOf(`${LABEL}, a, X`, null, "X")).toBeNull();
    expect(luSubgroupOf(`${LABEL}, a, X`, LABEL, null)).toBeNull();
  });

  it("drops rows missing a date or time", () => {
    expect(
      parseLuEvents(
        '<li class="event-row" data-module="A" data-date="xx"></li><li class="event-row" data-module="B" data-date="01.10.2026" data-time="9.00" data-time2="10:30" data-state="Live"></li>',
      ),
    ).toMatchObject([
      { subject: "B", start: "09:00", end: "10:30", room: null, building: null, lecturers: [] },
    ]);
  });

  it("asks for just the window and filters to it", async () => {
    const fake = createFakeUniversity();
    const got = await fetchLuEvents(fake.http, "26R-21023-PLK-1", "2026-10-05", "2026-10-11");
    expect(fake.requests[0]?.method).toBe("GET");
    expect(fake.requests[0]?.url).toBe(
      "https://lekciju-saraksts.lu.lv/grupa/26R-21023-PLK-1/hronologiski?datums_no=05.10.2026&datums_lidz=11.10.2026",
    );
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((e) => e.date >= "2026-10-05" && e.date <= "2026-10-11")).toBe(true);
  });
});
