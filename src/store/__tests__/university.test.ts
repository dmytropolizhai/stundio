/**
 * University mode end to end below the UI: pick an RTU / LU group, sync its events through
 * the engine, and read the day back through the same `resolvedDay` the screens use.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryCache, type AppCache } from "@/db";
import { createSyncEngine } from "@/sync";
import { UNIVERSITY_MAX_AGE_MS, type UniversityGroupRef } from "@/lib/university";
import { createAppStore } from "@/store";
import { createFakeUniversity, type FakeUniversity } from "@/lib/university/__tests__/fixtures.ts";

const LU_GROUP: UniversityGroupRef = {
  university: "lu",
  id: "26R-21023-PLK-1",
  label: "26R-21023 · Pilna laika: klātiene · 1-sem.",
  program: "Fizika",
};
const RTU_GROUP: UniversityGroupRef = {
  university: "rtu",
  id: "38532",
  label: "RABA0 · 1. k. · 1. gr.",
  program: "Arhitektūra",
};

let fake: FakeUniversity;
let cache: AppCache;
let clock: Date;

const makeStore = () =>
  createAppStore({ cache, engine: createSyncEngine({ http: fake.http, cache, now: () => clock }) });

beforeEach(() => {
  fake = createFakeUniversity();
  cache = createMemoryCache();
  clock = new Date("2026-10-12T08:00:00Z");
});

describe("university mode", () => {
  it("syncs an LU group's two-week window and resolves its days", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setUniversityGroup(LU_GROUP);

    expect(store.getState().identity()).toMatchObject({ persona: "university", group: LU_GROUP });
    const outcome = await store.getState().refresh();

    expect(outcome.status).toBe("idle");
    expect(outcome.refreshedDates).toHaveLength(14);
    expect(fake.requests[0]?.url).toContain("datums_no=12.10.2026&datums_lidz=25.10.2026");

    const day = store.getState().resolvedDay("2026-10-23");
    expect(day?.ttNum).toBe("lu:26R-21023-PLK-1");
    expect(day?.lessons.some((l) => l.status === "cancelled")).toBe(true);
    // Memoised: the same object until something changes.
    expect(store.getState().resolvedDay("2026-10-23")).toBe(day);
    // Outside the fetched window nothing is known yet.
    expect(store.getState().resolvedDay("2026-11-02")).toBeNull();
  });

  it("shows the university's English names when the app is not in Latvian", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setUniversityGroup(LU_GROUP);
    await store.getState().refresh();
    const names = () =>
      store
        .getState()
        .resolvedDay("2026-10-14")
        ?.lessons.map((l) => l.subject?.name) ?? [];
    expect(names()).toContain("Fizika I");
    await store.getState().setLang("en");
    expect(names()).toContain("Physics I");
    await store.getState().setUniversityNames("lv");
    expect(names()).toContain("Fizika I");
  });

  it("narrows to a subgroup and keeps whole-group events", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setUniversityGroup(LU_GROUP);
    await store.getState().refresh();
    const all = store.getState().resolvedDay("2026-10-12")?.lessons.length ?? 0;

    await store.getState().setUniversitySubgroup("fiziviens");
    // 12 October has a fizidivi-only lab.
    const mine = store.getState().resolvedDay("2026-10-12")?.lessons ?? [];
    expect(mine.length).toBeLessThan(all);
    expect(mine.every((l) => l.group === null || l.group === "fiziviens")).toBe(true);
  });

  it("does not refetch a fresh, covering cache — but does on force or once stale", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setUniversityGroup(RTU_GROUP);
    await store.getState().refresh();
    const calls = fake.requests.length;

    // Same week: its window is the one already cached.
    await store.getState().refresh({ date: "2026-10-16" });
    expect(fake.requests.length).toBe(calls);

    await store.getState().refresh({ force: true });
    expect(fake.requests.length).toBeGreaterThan(calls);

    const forced = fake.requests.length;
    clock = new Date(clock.getTime() + UNIVERSITY_MAX_AGE_MS);
    await store.getState().refresh();
    expect(fake.requests.length).toBeGreaterThan(forced);
  });

  it("fetches a week it has not seen yet", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setUniversityGroup(RTU_GROUP);
    await store.getState().refresh();
    const calls = fake.requests.length;
    await store.getState().refresh({ date: "2026-11-02", scope: "week" });
    expect(fake.requests.length).toBeGreaterThan(calls);
    // Weeks already fetched stay readable.
    expect(store.getState().resolvedDay("2026-10-14")).not.toBeNull();
    expect(store.getState().resolvedDay("2026-11-03")).not.toBeNull();
  });

  it("reports offline and keeps serving the cache", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setUniversityGroup(RTU_GROUP);
    await store.getState().refresh();
    fake.offline = true;
    const outcome = await store.getState().refresh({ force: true });
    expect(outcome.status).toBe("offline");
    expect(outcome.errors[0]).toContain("rtu 38532");
    expect(store.getState().resolvedDay("2026-10-14")).not.toBeNull();
  });

  it("lets only the latest refresh report — not a sync of the role the user just left", async () => {
    // The first request is held, then fails: an older refresh still on the network when a
    // newer one lands.
    let hold: Promise<void> | null = null;
    let release: () => void = () => undefined;
    const store = createAppStore({
      cache,
      engine: createSyncEngine({
        http: async (req) => {
          if (hold !== null) {
            const held = hold;
            hold = null;
            await held;
            throw new TypeError("Failed to fetch");
          }
          return fake.http(req);
        },
        cache,
        now: () => clock,
      }),
    });
    await store.getState().hydrate();
    await store.getState().setUniversityGroup(RTU_GROUP);
    hold = new Promise<void>((resolve) => {
      release = resolve;
    });

    const older = store.getState().refresh({ force: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await store.getState().refresh({ force: true });
    expect(store.getState().syncStatus).toBe("idle");

    release();
    expect((await older).status).toBe("offline");
    expect(store.getState().syncStatus).toBe("idle");
  });

  it("reports a rejecting server as an error", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setUniversityGroup(RTU_GROUP);
    fake.status = 500;
    expect((await store.getState().refresh()).status).toBe("error");
  });

  it("syncs nothing until a group is picked", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setUniversity("lu");
    expect((await store.getState().refresh()).status).toBe("idle");
    expect(fake.requests).toHaveLength(0);
    expect(store.getState().resolvedDay("2026-10-14")).toBeNull();
    expect(store.getState().universitySchedule()).toBeNull();
  });

  it("drops the group when switching to the other university", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setUniversityGroup(LU_GROUP, "fiziviens");
    expect(store.getState().settings.universitySubgroup).toBe("fiziviens");
    await store.getState().setUniversity("lu");
    expect(store.getState().settings.universityGroup).toEqual(LU_GROUP);
    await store.getState().setUniversity("rtu");
    expect(store.getState().settings.universityGroup).toBeNull();
    expect(store.getState().settings.universitySubgroup).toBeNull();
  });

  it("previews a group's subgroups before it is picked", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    expect(await store.getState().previewUniversityGroup(LU_GROUP)).toEqual([
      "fizicetri",
      "fizidivi",
      "fizitris",
      "fiziviens",
    ]);
    expect(await store.getState().previewUniversityGroup(RTU_GROUP)).toEqual([]);
    // The preview is cached, so picking it afterwards needs no second fetch.
    await store.getState().setUniversityGroup(RTU_GROUP);
    const calls = fake.requests.length;
    await store.getState().refresh();
    expect(fake.requests.length).toBe(calls);
  });

  it("loads the live catalogue through the engine", async () => {
    const store = makeStore();
    const programs = await store.getState().loadUniversityPrograms("lu");
    const physics = programs.find((p) => p.code === "21023");
    if (physics === undefined) throw new Error("no physics program");
    const groups = await store.getState().loadUniversityGroups(physics);
    expect(groups.map((g) => g.id)).toContain("26R-21023-PLK-1");
  });

  it("labels nothing for the RVT substitution feed", async () => {
    const store = makeStore();
    await store.getState().hydrate();
    await store.getState().setUniversityGroup(RTU_GROUP);
    expect(store.getState().selectedClassShort()).toBeNull();
    expect(store.getState().identityLabel()).toBeNull();
  });

  it("hydrates cached schedules on the next launch", async () => {
    const first = makeStore();
    await first.getState().hydrate();
    await first.getState().setUniversityGroup(RTU_GROUP);
    await first.getState().refresh();

    fake.offline = true;
    const second = makeStore();
    await second.getState().hydrate();
    expect(second.getState().resolvedDay("2026-10-14")).not.toBeNull();
  });
});
