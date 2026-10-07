import { describe, expect, it } from "vitest";
import { attr, escapeHtml, html, raw } from "./html.ts";

describe("html tag", () => {
  it("escapes strings but not nested Html", () => {
    const evil = `<img src=x onerror="alert('1')">`;
    expect(html`<p>${evil}</p>`.html).toBe(
      "<p>&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;</p>",
    );
    expect(html`<p>${raw("<b>ok</b>")}</p>`.html).toBe("<p><b>ok</b></p>");
  });

  it("drops false/null/undefined and flattens arrays", () => {
    expect(html`${false}${null}${undefined}${[1, "a", html`<i></i>`]}`.html).toBe("1a<i></i>");
  });

  it("escapes the ampersand first", () => {
    expect(escapeHtml("a & b < c")).toBe("a &amp; b &lt; c");
  });
});

describe("attr", () => {
  it("omits absent attributes entirely", () => {
    expect(attr("aria-current", null).html).toBe("");
    expect(attr("aria-current", false).html).toBe("");
    expect(attr("aria-current", "page").html).toBe(' aria-current="page"');
  });
});
