/**
 * The what's-new flow end to end: the hook decides, the sheet renders, and the decision is
 * written back to the cache. The pure "which entries" maths is covered in
 * `lib/version/__tests__/changelog.test.ts`; what matters here is the wiring around it.
 */
import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StoreContext } from "@/store";
import { WhatsNewSheet } from "../screens/WhatsNewSheet.tsx";
import { useWhatsNew } from "../hooks/useWhatsNew.ts";
import { CHANGELOG } from "@/ui/i18n";
import { bootHarness, type Harness } from "./harness.tsx";

const Probe = () => {
  const whatsNew = useWhatsNew();
  return (
    <>
      <button type="button" onClick={whatsNew.show}>
        open-from-settings
      </button>
      <WhatsNewSheet
        open={whatsNew.open}
        unread={whatsNew.unread}
        history={whatsNew.history}
        onClose={whatsNew.dismiss}
      />
    </>
  );
};

const mount = async (harness: Harness) => {
  await act(async () => {
    render(
      <StoreContext.Provider value={harness.store}>
        <Probe />
      </StoreContext.Provider>,
    );
    await Promise.resolve();
  });
};

const seenVersion = (harness: Harness) =>
  harness.store.getState().settings.lastSeenChangelogVersion;

describe("what's new", () => {
  it("opens by itself on the first launch after an update", async () => {
    const harness = await bootHarness({ lastSeenChangelogVersion: "v1.0.1-ozols" });
    await mount(harness);

    expect(screen.getByText("Kas jauns")).toBeDefined();
    // The two releases the user skipped, not the whole history, above the fold.
    expect(screen.getByText("Kopīgo savu nedēļas sarakstu kā attēlu")).toBeDefined();
    expect(screen.getByText("Valodas izvēle uzreiz pēc pirmās palaišanas")).toBeDefined();
    expect(screen.getByText("Iepriekšējās versijas")).toBeDefined();
  });

  it("marks the notes read on dismiss and stays shut afterwards", async () => {
    const harness = await bootHarness({ lastSeenChangelogVersion: "v1.0.1-ozols" });
    await mount(harness);

    await act(async () => {
      fireEvent.click(screen.getByText("Sapratu"));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(seenVersion(harness)).toBe(__APP_VERSION__);
    });
    expect(screen.queryByText("Kas jauns")).toBeNull();
  });

  it("shows nothing but still records a baseline on an unmarked install", async () => {
    const harness = await bootHarness({ lastSeenChangelogVersion: null });
    await mount(harness);

    expect(screen.queryByText("Kas jauns")).toBeNull();
    // Without this the baseline would stay null and no future update could announce itself.
    await waitFor(() => {
      expect(seenVersion(harness)).toBe(__APP_VERSION__);
    });
  });

  it("stays shut when the user is already current", async () => {
    const harness = await bootHarness({ lastSeenChangelogVersion: __APP_VERSION__ });
    await mount(harness);

    expect(screen.queryByText("Kas jauns")).toBeNull();
  });

  it("leaves onboarding alone", async () => {
    const harness = await bootHarness({
      selectedClassId: null,
      lastSeenChangelogVersion: "v1.0.1-ozols",
    });
    await mount(harness);

    expect(screen.queryByText("Kas jauns")).toBeNull();
    expect(seenVersion(harness)).toBe("v1.0.1-ozols");
  });

  it("opens the full history on demand from Settings", async () => {
    const harness = await bootHarness({ lastSeenChangelogVersion: __APP_VERSION__ });
    await mount(harness);

    await act(async () => {
      fireEvent.click(screen.getByText("open-from-settings"));
      await Promise.resolve();
    });

    expect(screen.getByText("Kas jauns")).toBeDefined();
    for (const entry of CHANGELOG) {
      expect(screen.getByText(`Versija ${entry.version}`)).toBeDefined();
    }
  });
});

describe("changelog content", () => {
  it("has the same number of lines in every language", () => {
    for (const entry of CHANGELOG) {
      const counts = Object.values(entry.lines).map((lines) => lines.length);
      expect(new Set(counts).size, entry.version).toBe(1);
    }
  });

  it("has no empty lines and no duplicate versions", () => {
    for (const entry of CHANGELOG) {
      for (const [lang, lines] of Object.entries(entry.lines)) {
        expect(lines.length, `${entry.version}/${lang}`).toBeGreaterThan(0);
        for (const line of lines) expect(line.trim(), `${entry.version}/${lang}`).not.toBe("");
      }
    }
    const versions = CHANGELOG.map((e) => e.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it("documents the version this build ships as", () => {
    expect(CHANGELOG.some((e) => e.version === __APP_VERSION__)).toBe(true);
  });
});
