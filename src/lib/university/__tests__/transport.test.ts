import { describe, expect, it } from "vitest";
import { attributesOf, decodeEntities, textOf } from "../html.ts";
import { getHtml, postForm, universityBaseUrl, UniversityError } from "../transport.ts";
import { createFakeUniversity } from "./fixtures.ts";

describe("html helpers", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("a &amp; b &quot;c&quot; &#x2197; &#65; &unknown;")).toBe(
      'a & b "c" ↗ A &unknown;',
    );
    expect(textOf("<b>x</b>\n  &nbsp;y")).toBe("x y");
    expect(attributesOf('<li data-a="1 &amp; 2" class="x">')).toEqual({
      "data-a": "1 & 2",
      class: "x",
    });
  });
});

describe("transport", () => {
  it("goes straight to the university under test", () => {
    expect(universityBaseUrl("rtu")).toBe("https://nodarbibas.rtu.lv");
    expect(universityBaseUrl("lu")).toBe("https://lekciju-saraksts.lu.lv");
  });

  it("parses a JSON string body and passes objects through", async () => {
    const fake = createFakeUniversity();
    expect(await postForm(fake.http, "rtu", "/findCourseByProgramId", {})).toEqual([1]);
    expect(Array.isArray(await postForm(fake.http, "rtu", "/findProgramsBySemesterId", {}))).toBe(
      true,
    );
    expect(fake.requests[0]?.headers?.["X-Requested-With"]).toBe("XMLHttpRequest");
  });

  it("rejects a non-JSON body and a bad status as UniversityError", async () => {
    const fake = createFakeUniversity();
    await expect(postForm(fake.http, "rtu", "/", {})).rejects.toBeInstanceOf(UniversityError);
    fake.status = 503;
    await expect(getHtml(fake.http, "lu", "/")).rejects.toThrow("/: HTTP 503");
  });

  it("rejects an HTML request answered with something else", async () => {
    const fake = createFakeUniversity();
    await expect(getHtml(fake.http, "rtu", "/findCourseByProgramId")).rejects.toThrow(
      "response was not HTML",
    );
  });
});
