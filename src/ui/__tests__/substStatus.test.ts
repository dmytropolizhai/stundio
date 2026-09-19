import { describe, expect, it } from "vitest";
import type { SubstKind } from "@/lib/edupage";
import { substKindToStatus } from "../screens/changes-view/subst-status.ts";

describe("substKindToStatus", () => {
  it("maps every substitution kind onto a badge status", () => {
    expect(substKindToStatus("cancelled")).toBe("cancelled");
    expect(substKindToStatus("moved_in")).toBe("moved");
    expect(substKindToStatus("moved_out")).toBe("moved");
    expect(substKindToStatus("substitution")).toBe("substituted");
    expect(substKindToStatus("room_change")).toBe("room_change");
    expect(substKindToStatus("added")).toBe("added");
  });

  it("falls back to 'substituted' for kinds without a badge of their own", () => {
    expect(substKindToStatus("unknown" as SubstKind)).toBe("substituted");
  });
});
