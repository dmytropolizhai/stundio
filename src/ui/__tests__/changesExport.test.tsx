/**
 * Changes screen → "Add changes to calendar": exports just the changed lessons to the file target
 * (the OS share sheet then picks the calendar app) and explains an empty result.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const route = vi.hoisted(() => vi.fn());
vi.mock("@/lib/calendar", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, routeCalendarExport: route };
});

import { StoreContext } from "@/store";
import { ChangesExport } from "../screens/changes-view/changes-export.tsx";
import { bootHarness, clickAndSettle } from "./harness.tsx";

describe("ChangesExport", () => {
  beforeEach(() => route.mockReset());

  it("shares only the changes and explains an empty result", async () => {
    const h = await bootHarness();
    route.mockResolvedValue({ kind: "nothing-to-export" });
    render(
      <StoreContext.Provider value={h.store}>
        <ChangesExport />
      </StoreContext.Provider>,
    );
    await clickAndSettle(() => screen.getByRole("button").click());
    expect(route.mock.calls[0]?.[0]).toBe("ics");
    expect(route.mock.calls[0]?.[2]).toMatchObject({ changesOnly: true });
    expect(screen.getByRole("status").textContent).toContain("nav izmaiņu");
  });
});
