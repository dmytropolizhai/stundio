/**
 * client.ts against a stub HttpClient. The point of these tests is the error envelope:
 * EduPage answers HTTP 200 with { e: "..." } on bad input, so a status check is not enough.
 */
import { describe, expect, it, vi } from "vitest";
import {
  ANON_GSH,
  EdupageError,
  fetchDaySubstitutionsHtml,
  fetchRegularTimetable,
  fetchTimetableList,
} from "../client.ts";
import { parseLooseJson } from "../http.ts";
import type { HttpClient } from "../http.ts";

const ok =
  (data: unknown): HttpClient =>
  () =>
    Promise.resolve({ status: 200, data });

describe("callEdupage error handling", () => {
  it("throws on the { e } envelope even though the status is 200", async () => {
    const http = ok({ e: "Error: Invalid tt_num" });
    await expect(fetchRegularTimetable(http, "9999")).rejects.toBeInstanceOf(EdupageError);
    await expect(fetchRegularTimetable(http, "9999")).rejects.toThrow(/Invalid tt_num/);
  });

  it("throws on a non-2xx status", async () => {
    const http: HttpClient = () => Promise.resolve({ status: 503, data: {} });
    await expect(fetchTimetableList(http, 2026)).rejects.toThrow(/HTTP 503/);
  });

  it("throws when the payload has no `r`", async () => {
    await expect(fetchTimetableList(ok({ something: 1 }), 2026)).rejects.toThrow(/no `r`/);
  });

  it("throws when the body is not an object at all", async () => {
    await expect(fetchTimetableList(ok("<html>login</html>"), 2026)).rejects.toThrow(
      /not a JSON object/,
    );
  });
});

describe("request shape", () => {
  it("sends the documented envelope with the anonymous hash", async () => {
    const http = vi.fn<HttpClient>(() =>
      Promise.resolve({ status: 200, data: { r: { regular: { timetables: [] } } } }),
    );
    await fetchTimetableList(http, 2026);

    const req = http.mock.calls[0]?.[0];
    expect(req?.url).toContain("ttviewer.js?__func=getTTViewerData");
    expect(req?.body).toEqual({ __args: [null, 2026], __gsh: ANON_GSH });
    expect(req?.headers?.["Referer"]).toContain("/timetable/");
  });

  it("sends tt_num as a string, not a number", async () => {
    const http = vi.fn<HttpClient>(() =>
      Promise.resolve({ status: 200, data: { r: { dbiAccessorRes: { tables: [] } } } }),
    );
    // deliberately pass something numeric-looking to prove the coercion
    await fetchRegularTimetable(http, "1175");
    expect(http.mock.calls[0]?.[0].body).toEqual({
      __args: [null, "1175"],
      __gsh: ANON_GSH,
    });
  });

  it("sends the substitution date+mode object", async () => {
    const http = vi.fn<HttpClient>(() => Promise.resolve({ status: 200, data: { r: "<div/>" } }));
    await fetchDaySubstitutionsHtml(http, "2026-09-09");
    expect(http.mock.calls[0]?.[0].body).toEqual({
      __args: [null, { date: "2026-09-09", mode: "classes" }],
      __gsh: ANON_GSH,
    });
  });
});

describe("response unwrapping", () => {
  it("hides hidden timetables and surfaces default_num", async () => {
    const http = ok({
      r: {
        regular: {
          default_num: "1175",
          timetables: [
            { tt_num: "1175", year: 2026, text: "x", datefrom: "2026-09-07" },
            { tt_num: "999", year: 2026, text: "y", datefrom: "2026-09-07", hidden: true },
          ],
        },
      },
    });
    const { entries, defaultNum } = await fetchTimetableList(http, 2026);
    expect(entries.map((e) => e.tt_num)).toEqual(["1175"]);
    expect(defaultNum).toBe("1175");
  });

  it("turns the table array into a map keyed by table id", async () => {
    const http = ok({
      r: { dbiAccessorRes: { tables: [{ id: "classes", data_rows: [{ id: "-1" }] }] } },
    });
    expect(await fetchRegularTimetable(http, "1175")).toEqual({ classes: [{ id: "-1" }] });
  });

  it("rejects a substitution payload that is not an HTML string", async () => {
    await expect(fetchDaySubstitutionsHtml(ok({ r: { nope: 1 } }), "2026-09-09")).rejects.toThrow(
      /expected an HTML string/,
    );
  });
});

describe("parseLooseJson", () => {
  it("strips the junk prefix EduPage sometimes emits", () => {
    expect(parseLooseJson('garbage{"r":1}')).toEqual({ r: 1 });
  });

  it("returns the raw text when it is not JSON", () => {
    expect(parseLooseJson("not json")).toBe("not json");
  });
});
