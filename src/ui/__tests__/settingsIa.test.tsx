/**
 * The rethought Settings: ordered by why a student opens it. The identity and its filters first,
 * then the one status line (calm unless alerts are blocked), the common groups, and everything set
 * once a term folded behind a single row.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const env = vi.hoisted(() => ({ denied: false }));
vi.mock("@/ui/hooks/useNotificationPermission.ts", () => ({
  useNotificationPermissionDenied: () => env.denied,
}));

import { StoreContext } from "@/store";
import { TooltipProvider } from "@/ds";
import { SettingsView } from "../screens/settings-view";
import { bootHarness, clickAndSettle, type Harness } from "./harness.tsx";

const renderSettings = (harness: Harness) =>
  render(
    <TooltipProvider>
      <StoreContext.Provider value={harness.store}>
        <SettingsView onPickClass={vi.fn()} onShowWhatsNew={vi.fn()} />
      </StoreContext.Provider>
    </TooltipProvider>,
  );

describe("Settings information architecture", () => {
  it("puts what I am looking at first, then the status line, then the groups", async () => {
    env.denied = false;
    const harness = await bootHarness();
    renderSettings(harness);

    const identity = screen.getByRole("button", { name: /Mainīt/ });
    const status = screen.getAllByRole("status")[0] as HTMLElement;
    const firstGroup = screen.getAllByRole("heading", { level: 2 })[0] as HTMLElement;
    const before = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(identity, status)).toBe(true);
    expect(before(status, firstGroup)).toBe(true);
  });

  it("keeps the status line to one calm sentence with the refresh beside it", async () => {
    env.denied = false;
    const harness = await bootHarness();
    renderSettings(harness);

    expect((screen.getAllByRole("status")[0] as HTMLElement).textContent).toMatch(/\S/);
    expect(screen.getByRole("button", { name: /^Sinhronizācija/ })).toBeDefined();
    // Nothing to fix, so nothing cautionary.
    expect(screen.queryByText("Paziņojumi bloķēti")).toBeNull();
  });

  it("reports blocked notifications once, in the status strip, not again inside the group", async () => {
    env.denied = true;
    const harness = await bootHarness();
    renderSettings(harness);

    expect(screen.getAllByText("Paziņojumi bloķēti")).toHaveLength(1);
    env.denied = false;
  });

  it("folds what is set once a term behind one row that opens in place", async () => {
    env.denied = false;
    const harness = await bootHarness();
    renderSettings(harness);

    const more = screen.getByRole("button", { name: "Papildu iestatījumi" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("switch", { name: "Apvienot vienādas stundas" })).toBeNull();
    expect(screen.queryByRole("switch", { name: /Anonīm|analītika/i })).toBeNull();

    await clickAndSettle(() => {
      fireEvent.click(more);
    });
    expect(more.getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById(more.getAttribute("aria-controls") ?? "");
    expect(panel).not.toBeNull();
    expect(
      within(panel as HTMLElement).getByRole("switch", { name: "Apvienot vienādas stundas" }),
    ).toBeDefined();
    expect(within(panel as HTMLElement).getAllByRole("switch")).toHaveLength(3);

    await clickAndSettle(() => {
      fireEvent.click(more);
    });
    expect(more.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps the obvious display switches in Appearance, with their hint read but not shown", async () => {
    env.denied = false;
    const harness = await bootHarness();
    renderSettings(harness);

    const toggle = screen.getByRole("switch", { name: "Rādīt laiku" });
    const hint = document.getElementById(toggle.getAttribute("aria-describedby") ?? "");
    expect(hint?.className).toContain("sr-only");
    const group = toggle.closest("section");
    expect(group?.querySelector("h2")?.textContent).toMatch(/Izskats/);
  });
});
