/**
 * A fake EduPage that answers from the real 2026-09-09 fixtures, so sync tests exercise the
 * actual payload shapes rather than hand-written stubs. Counts calls, and can be told to
 * fail like a dead network or like a rejecting server.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { HttpClient, HttpRequest } from "@/lib/edupage";

const DATA_DIR = join(import.meta.dirname, "..", "..", "..", "data");
const read = (name: string): string => readFileSync(join(DATA_DIR, name), "utf8");
const readJson = (name: string): unknown => JSON.parse(read(name));

export type Endpoint = "list" | "timetable" | "substitutions";

export type FakeServer = {
  http: HttpClient;
  calls: Record<Endpoint, number>;
  /** Reject every request as if the device were offline. */
  offline: boolean;
  /** Answer HTTP 200 with the `{ e }` envelope EduPage uses for real errors. */
  serverError: boolean;
  /** Stand in for the day fixture, so a test can publish a second version of a day. */
  substitutionsHtml: string | null;
  reset: () => void;
};

const endpointOf = (url: string): Endpoint | null => {
  if (url.includes("getTTViewerData")) return "list";
  if (url.includes("regularttGetData")) return "timetable";
  if (url.includes("getSubstViewerDayDataHtml")) return "substitutions";
  return null;
};

export const createFakeServer = (): FakeServer => {
  const server: FakeServer = {
    calls: { list: 0, timetable: 0, substitutions: 0 },
    offline: false,
    serverError: false,
    substitutionsHtml: null,
    reset: () => {
      server.calls = { list: 0, timetable: 0, substitutions: 0 };
      server.offline = false;
      server.serverError = false;
      server.substitutionsHtml = null;
    },
    http: (req: HttpRequest) => {
      const endpoint = endpointOf(req.url);
      if (endpoint === null) return Promise.reject(new Error(`unexpected url ${req.url}`));
      server.calls[endpoint] += 1;

      if (server.offline) return Promise.reject(new TypeError("Failed to fetch"));
      if (server.serverError) {
        return Promise.resolve({ status: 200, data: { e: "Error: nope" } });
      }

      switch (endpoint) {
        case "list":
          return Promise.resolve({ status: 200, data: readJson("ttviewer.json") });
        case "timetable":
          return Promise.resolve({ status: 200, data: readJson("regulartt_1175.json") });
        case "substitutions":
          return Promise.resolve({
            status: 200,
            data: { r: server.substitutionsHtml ?? read("subst_2026-09-09_classes.html") },
          });
      }
    },
  };
  return server;
};
