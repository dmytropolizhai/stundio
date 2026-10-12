import { describe, expect, it } from "vitest";
import {
  fetchLuEvents,
  luGroupLabel,
  luSubgroupOf,
  parseLuCatalog,
  parseLuEvents,
  parseLuGroupLabel,
} from "../lu.ts";
import { createFakeUniversity, LU, readFixture } from "./fixtures.ts";

const LABEL = "26R-21023 Fizika Akadēmiskā bakalaura,Pilna laika: klātiene,1-sem.";

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
    });
    expect(doctoral?.groups).toEqual([
      {
        university: "lu",
        id: "26R-30617-PLK-1",
        label: "26R-30617 · Pilna laika: klātiene · 1-sem.",
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
    expect(business?.groups[0]?.label).toBe("26R-207B7 · Nepilna laika: klātiene · 1-sem.");
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

describe("LU events", () => {
  const html = readFixture(LU.chrono);
  const events = parseLuEvents(html);

  it("reads the group label the data-groups entries are keyed by", () => {
    expect(parseLuGroupLabel(html)).toBe(LABEL);
    expect(parseLuGroupLabel("<p></p>")).toBeNull();
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

  it("decides the subgroup from data-groups", () => {
    const whole = `${LABEL},MateB044, ${LABEL},fiziviens,MateB044, ${LABEL},fizidivi,MateB044`;
    expect(luSubgroupOf(whole, LABEL)).toBeNull();
    expect(luSubgroupOf(`${LABEL},fiziviens,FiziB011`, LABEL)).toBe("fiziviens");
    expect(luSubgroupOf(`${LABEL},a,X, ${LABEL},b,X`, LABEL)).toBeNull();
    expect(luSubgroupOf("Other,a,X", LABEL)).toBeNull();
    expect(luSubgroupOf(`${LABEL},a,X`, null)).toBeNull();
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
