/**
 * The DS bottom sheet's height contract — the one thing that broke on iPhone.
 *
 * iOS Safari resolves `vh` against the *large* viewport (address bar and toolbar retracted), so
 * a sheet anchored to `bottom: 0` and sized in `vh` is taller than the screen actually is: it
 * grew up over the app header, and its own grab handle, title and close button went off the top
 * where nothing could reach them. The sheet now caps itself against `--app-viewport-height`
 * (`dvh`, with a `vh` fallback) minus the top safe-area inset and scrolls its body instead.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomSheet } from "@/ds";
import { StoreContext } from "@/store";
import { CustomizationSheet } from "../screens/sheets/CustomizationSheet.tsx";
import { bootHarness } from "./harness.tsx";

/** Any `max-h-[…vh]` — the sizing that puts the sheet off the top of an iPhone screen. */
const VH_HEIGHT = /max-h-\[[^\]]*vh/;

describe("BottomSheet", () => {
  it("caps itself against the visible viewport, minus the top inset", () => {
    render(
      <BottomSheet open onClose={() => {}} title="Title">
        <p>Body</p>
      </BottomSheet>,
    );

    const sheet = screen.getByRole("dialog");
    expect(sheet.className).toContain(
      "max-h-[calc(var(--app-viewport-height)-var(--app-inset-top)-12px)]",
    );
    // The cap only bites if the sheet lays its header, body and footer out as a column.
    expect(sheet.className).toContain("flex-col");
  });

  it("scrolls the body, keeping the title and close button reachable", () => {
    render(
      <BottomSheet open onClose={() => {}} title="Title" footer={<button>Reset</button>}>
        <p>Body</p>
      </BottomSheet>,
    );

    const sheet = screen.getByRole("dialog");
    const body = screen.getByText("Body").parentElement;
    expect(body?.className).toContain("overflow-y-auto");
    // `min-h-0` is what lets a flex item shrink below its content and actually scroll.
    expect(body?.className).toContain("min-h-0");

    // Header and footer sit outside that scroller, so they stay pinned however long the body is.
    const title = screen.getByText("Title");
    const footer = screen.getByText("Reset");
    expect(body?.contains(title)).toBe(false);
    expect(body?.contains(footer)).toBe(false);
    expect(sheet.contains(title)).toBe(true);
  });

  it("leaves no `vh`-sized scroller inside the tallest sheet in the app", async () => {
    const harness = await bootHarness();
    render(
      <StoreContext.Provider value={harness.store}>
        <CustomizationSheet open onClose={() => {}} />
      </StoreContext.Provider>,
    );

    const sheet = screen.getByRole("dialog");
    const offenders = [...sheet.querySelectorAll("*")].filter((el) =>
      VH_HEIGHT.test(el.className.toString()),
    );
    expect(offenders).toHaveLength(0);
    expect(VH_HEIGHT.test(sheet.className)).toBe(false);
  });
});
