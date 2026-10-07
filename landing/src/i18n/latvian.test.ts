import { describe, expect, it } from "vitest";
import { withLatvian } from "./latvian.ts";

describe("withLatvian", () => {
  it("marks Latvian fragments on other-language pages", () => {
    expect(withLatvian("Корпус: Galvenā ēka или TIC", "ru").html).toBe(
      'Корпус: <span lang="lv">Galvenā ēka</span> или TIC',
    );
    expect(withLatvian("Не связан с Rīgas Valsts tehnikums, EduPage", "ru").html).toContain(
      '<span lang="lv">Rīgas Valsts tehnikums</span>,',
    );
  });

  it("leaves the Latvian page alone and still escapes", () => {
    expect(withLatvian("Galvenā ēka <b>", "lv").html).toBe("Galvenā ēka &lt;b&gt;");
  });
});
