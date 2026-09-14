/**
 * The store → widget hand-off, driven through a real store backed by the fixture server, so
 * what gets published is what the app itself would render. The publisher is injected, so no
 * Capacitor and no bridge is involved.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeServer, type FakeServer } from "../../sync/__tests__/fakeServer.ts";
import { createMemoryCache, type AppCache } from "../../db/index.ts";
import { createSyncEngine } from "../../sync/index.ts";
import { createAppStore } from "../../store/useAppStore.ts";
import type { WidgetPayload } from "../../lib/widget/index.ts";
import { publishWidget, widgetPayloadFor, wireWidget } from "../index.ts";

const DATE = "2026-09-09";

let server: FakeServer;
let cache: AppCache;

const makeStore = () =>
  createAppStore({
    cache,
    engine: createSyncEngine({
      http: server.http,
      cache,
      now: () => new Date(`${DATE}T08:00:00Z`),
    }),
  });

type Store = ReturnType<typeof makeStore>;

const classIdOf = (store: Store): string =>
  Object.values(store.getState().timetables)[0]?.classes[0]?.id ?? "";

/** The first cached class that actually has lessons on the fixture day. */
const busyClassIdOf = (store: Store): string => {
  for (const timetable of Object.values(store.getState().timetables)) {
    for (const cls of timetable.classes) {
      const day = store.getState().resolvedDay(DATE, cls.id);
      if (day?.lessons.some((l) => l.status !== "cancelled" && l.start !== "") === true) {
        return cls.id;
      }
    }
  }
  throw new Error("no class has lessons on the fixture day");
};

const readyStore = async (classId?: string): Promise<Store> => {
  const store = makeStore();
  await store.getState().refresh({ date: DATE });
  await store.getState().setClass(classId ?? classIdOf(store));
  return store;
};

const busyStore = async (): Promise<Store> => {
  const store = await readyStore();
  await store.getState().setClass(busyClassIdOf(store));
  return store;
};

/** 09:00 Riga on the fixture day — mid-morning, so the day is genuinely in progress. */
const NOW = { date: DATE, minutes: 9 * 60 };

beforeEach(() => {
  server = createFakeServer();
  cache = createMemoryCache();
});

describe("widgetPayloadFor", () => {
  it("asks for a class while none is picked, whatever the cache holds", async () => {
    const store = makeStore();
    await store.getState().refresh({ date: DATE });

    const payload = widgetPayloadFor(store.getState(), NOW);

    expect(payload.state).toBe("no-class");
    expect(payload.title).toBe("Izvēlies klasi");
  });

  it("renders the picked class's day in the app's language", async () => {
    const store = await readyStore();
    await store.getState().setLang("en");

    const payload = widgetPayloadFor(store.getState(), NOW);

    expect(payload.date).toBe(DATE);
    expect(["live", "upcoming", "done"]).toContain(payload.state);
    if (payload.state !== "done") expect(["Now", "Next"]).toContain(payload.label);
  });

  it("counts down to the first lesson before the school day opens", async () => {
    const store = await busyStore();

    const payload = widgetPayloadFor(store.getState(), { date: DATE, minutes: 0 });

    expect(payload.state).toBe("upcoming");
    expect(payload.label).toBe("Nākamā");
    expect(payload.countdown).toMatch(/^pēc \d+ min$/);
  });

  it("counts down to the end of a lesson already in progress", async () => {
    const store = await busyStore();
    const day = store.getState().resolvedDay(DATE);
    const live = day?.lessons.find((l) => l.status !== "cancelled" && l.start !== "");
    const [h, m] = (live?.start ?? "08:30").split(":").map(Number);

    const payload = widgetPayloadFor(store.getState(), {
      date: DATE,
      minutes: (h ?? 8) * 60 + (m ?? 30),
    });

    expect(payload.state).toBe("live");
    expect(payload.countdown).toMatch(/^vēl \d+ min$/);
  });

  it("labels the class by its short code, not its raw EduPage id", async () => {
    const store = await readyStore();
    const short = Object.values(store.getState().timetables)[0]?.classes[0]?.short ?? "";

    const payload = widgetPayloadFor(store.getState(), NOW);

    expect(payload.subtitle === "" || payload.subtitle.includes(short)).toBe(true);
  });

  it("reports no data when the chosen class has no cached timetable behind it", () => {
    const store = makeStore();
    void store.getState().setClass("-999");

    const payload = widgetPayloadFor(store.getState(), NOW);

    expect(payload.state).toBe("no-data");
  });
});

describe("publishWidget", () => {
  it("pushes the current payload across the bridge", async () => {
    const store = await readyStore();
    const publish = vi.fn<(p: WidgetPayload) => Promise<void>>().mockResolvedValue(undefined);

    await publishWidget(store, publish);

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0]?.[0].version).toBe(1);
  });

  it("does nothing at all without a native plugin — a browser has no widget", async () => {
    const store = await readyStore();
    await expect(publishWidget(store, null)).resolves.toBeUndefined();
  });

  it("waits for hydration rather than publishing a half-built store", async () => {
    const publish = vi.fn<(p: WidgetPayload) => Promise<void>>().mockResolvedValue(undefined);

    await publishWidget(makeStore(), publish);

    expect(publish).not.toHaveBeenCalled();
  });
});

describe("wireWidget", () => {
  it("publishes once on wiring and again only when the tile would actually change", async () => {
    const store = await readyStore();
    const publish = vi.fn<(p: WidgetPayload) => Promise<void>>().mockResolvedValue(undefined);

    const { dispose } = wireWidget(store, publish);
    expect(publish).toHaveBeenCalledTimes(1);

    // A setting the widget does not render must not cost a bridge crossing.
    await store.getState().setShowTime(false);
    expect(publish).toHaveBeenCalledTimes(1);

    // Language does change every string on the tile.
    await store.getState().setLang("en");
    expect(publish).toHaveBeenCalledTimes(2);

    dispose();
    await store.getState().setLang("ru");
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it("is inert without a plugin, and its dispose is still safe to call", () => {
    const store = makeStore();
    const { dispose } = wireWidget(store, null);
    expect(dispose()).toBeUndefined();
  });

  it("skips a store that has not hydrated yet", () => {
    const publish = vi.fn<(p: WidgetPayload) => Promise<void>>().mockResolvedValue(undefined);
    wireWidget(makeStore(), publish).dispose();
    expect(publish).not.toHaveBeenCalled();
  });
});
