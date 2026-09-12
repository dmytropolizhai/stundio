/**
 * The refresh policy from PLAN.md Phase 2, driven against the real fixture payloads.
 * Every assertion here is about *when* the app talks to the school — the thing that
 * decides whether it feels instant offline and whether it is a good citizen online.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createFakeServer, type FakeServer } from "./fakeServer.ts";
import { createMemoryCache } from "../../db/index.ts";
import { createSyncEngine, schoolYearOf, todayInRiga, LIST_MAX_AGE_MS } from "../engine.ts";
import type { AppCache } from "../../db/index.ts";

const DATE = "2026-09-09";
const at = (iso: string) => () => new Date(iso);

let server: FakeServer;
let cache: AppCache;

const engineAt = (iso: string) => createSyncEngine({ http: server.http, cache, now: at(iso) });

beforeEach(() => {
  server = createFakeServer();
  cache = createMemoryCache();
});

describe("schoolYearOf", () => {
  it("rolls over in August, not January", () => {
    expect(schoolYearOf("2026-09-09")).toBe(2026);
    expect(schoolYearOf("2026-08-01")).toBe(2026);
    expect(schoolYearOf("2026-07-31")).toBe(2025);
    expect(schoolYearOf("2027-01-15")).toBe(2026);
  });
});

describe("todayInRiga", () => {
  it("uses Riga's calendar day, not the host's", () => {
    // 21:30 UTC is already the next day in Riga (UTC+3 in September).
    expect(todayInRiga(new Date("2026-09-09T21:30:00Z"))).toBe("2026-09-10");
    expect(todayInRiga(new Date("2026-09-09T10:00:00Z"))).toBe("2026-09-09");
  });
});

describe("a cold first sync", () => {
  it("fetches the list, the week, and both substitution days", async () => {
    const outcome = await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });

    expect(outcome.status).toBe("idle");
    expect(outcome.lastSyncAt).not.toBeNull();
    expect(server.calls.list).toBe(1);
    expect(server.calls.timetable).toBe(1);
    expect(server.calls.substitutions).toBe(2); // today + next school day
    expect(outcome.refreshedDates).toEqual(["2026-09-09", "2026-09-10"]);
  });

  it("caches a fully normalized timetable, not the raw tables", async () => {
    await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    const cached = await cache.getTimetable("1175");
    expect(cached?.meta.building).toBe("Galvenā ēka");
    expect(cached?.classes).toHaveLength(122);
    expect(cached?.lessons.length).toBeGreaterThan(0);
  });

  it("caches parsed substitutions, not HTML", async () => {
    await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    const day = await cache.getSubstitutions(DATE);
    expect(day?.items).toHaveLength(55);
    expect(day?.items.every((i) => i.raw.length > 0)).toBe(true);
  });
});

describe("the 12-hour rule on the timetable list", () => {
  it("does not refetch the list within 12h", async () => {
    await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    server.reset();

    await engineAt(`${DATE}T18:00:00Z`).sync({ date: DATE });
    expect(server.calls.list).toBe(0);
  });

  it("refetches the list once 12h have passed", async () => {
    await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    server.reset();

    const later = new Date(new Date(`${DATE}T08:00:00Z`).getTime() + LIST_MAX_AGE_MS + 1000);
    await createSyncEngine({ http: server.http, cache, now: () => later }).sync({ date: DATE });
    expect(server.calls.list).toBe(1);
  });

  it("refetches immediately when forced (pull-to-refresh)", async () => {
    await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    server.reset();

    await engineAt(`${DATE}T08:05:00Z`).sync({ date: DATE, force: true });
    expect(server.calls.list).toBe(1);
  });
});

describe("the cached-week rule", () => {
  it("never refetches a tt_num it already holds", async () => {
    await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    server.reset();

    const outcome = await engineAt(`${DATE}T09:00:00Z`).sync({ date: DATE });
    expect(server.calls.timetable).toBe(0);
    expect(outcome.fetchedTtNum).toBeNull();
  });

  it("still refreshes substitutions on every sync", async () => {
    await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    server.reset();

    await engineAt(`${DATE}T09:00:00Z`).sync({ date: DATE });
    expect(server.calls.substitutions).toBe(2);
  });

  it("picks the building's tt_num, not the default", async () => {
    await cache.putSettings({
      selectedClassId: null,
      building: "TIC",
      favorites: [],
      theme: "system",
      lang: "lv",
      mergeConsecutiveLessons: false,
      showTime: false,
      analyticsEnabled: true,
    });
    const outcome = await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    expect(outcome.fetchedTtNum).toBe("1174"); // TIC, not the 1175 default
  });
});

describe("weekend sync", () => {
  const SATURDAY = "2026-09-05"; // between the 09-01 and 09-07 published weeks

  it("also ensures next week's timetable, not just the one covering today", async () => {
    const outcome = await engineAt(`${SATURDAY}T08:00:00Z`).sync({ date: SATURDAY });

    expect(outcome.fetchedTtNum).toBe("1172"); // the week covering Saturday
    expect(server.calls.timetable).toBe(2); // 1172 (today) + 1175 (next week)
    expect(await cache.getTimetable("1172")).not.toBeNull();
    expect(await cache.getTimetable("1175")).not.toBeNull();
  });

  it("does not double-fetch once both weeks are already cached", async () => {
    await engineAt(`${SATURDAY}T08:00:00Z`).sync({ date: SATURDAY });
    server.reset();

    await engineAt(`${SATURDAY}T09:00:00Z`).sync({ date: SATURDAY });
    expect(server.calls.timetable).toBe(0);
  });

  it("skips the extra fetch on a weekday", async () => {
    await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE }); // DATE is a Wednesday
    expect(server.calls.timetable).toBe(1);
  });
});

describe("offline behaviour", () => {
  it("reports offline and keeps serving the cache", async () => {
    await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    server.reset();
    server.offline = true;

    const outcome = await engineAt(`${DATE}T09:00:00Z`).sync({ date: DATE });
    expect(outcome.status).toBe("offline");
    expect(outcome.lastSyncAt).toBeNull(); // the store keeps the previous value
    expect(await cache.getTimetable("1175")).not.toBeNull();
    expect((await cache.getSubstitutions(DATE))?.items).toHaveLength(55);
  });

  it("survives a cold start with no network at all", async () => {
    server.offline = true;
    const outcome = await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    expect(outcome.status).toBe("offline");
    expect(outcome.errors.length).toBeGreaterThan(0);
    expect(outcome.fetchedTtNum).toBeNull();
  });

  it("distinguishes a rejecting server from a dead network", async () => {
    server.serverError = true;
    const outcome = await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    expect(outcome.status).toBe("error");
    expect(outcome.errors[0]).toContain("Error: nope");
  });

  it("serves the stale timetable list when the list fetch fails", async () => {
    await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });
    server.offline = true;

    // 13h later: the list is due for a refresh, but the network is gone.
    const later = new Date(`${DATE}T21:00:00Z`);
    const outcome = await createSyncEngine({
      http: server.http,
      cache,
      now: () => later,
    }).sync({ date: DATE });

    expect(outcome.status).toBe("offline");
    // The cached week was still selectable from the stale list, so nothing was refetched.
    expect(outcome.fetchedTtNum).toBeNull();
  });
});

describe("retention", () => {
  it("prunes substitutions older than 14 days", async () => {
    for (const d of ["2026-08-01", "2026-08-20", "2026-09-01"]) {
      await cache.putSubstitutions({
        date: d,
        mode: "classes",
        notes: [],
        items: [],
        fetchedAt: "x",
      });
    }
    const outcome = await engineAt(`${DATE}T08:00:00Z`).sync({ date: DATE });

    expect(outcome.prunedDays).toBe(2); // 08-01 and 08-20 are >14 days before 09-09
    expect(await cache.getSubstitutions("2026-09-01")).not.toBeNull();
    expect(await cache.getSubstitutions("2026-08-20")).toBeNull();
  });
});
