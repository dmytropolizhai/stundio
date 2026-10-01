import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeriodRuns } from "../screens/changes-view/period-runs.tsx";

describe("PeriodRuns", () => {
  it("draws one cell per period and fuses consecutive ones into a block", () => {
    render(<PeriodRuns periods={[9, 10, 11]} label="Period" />);
    const root = screen.getByTestId("period-runs");
    const blocks = root.querySelectorAll("[aria-hidden='true'] > span");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.textContent).toBe("91011");
    expect(root.querySelector(".sr-only")?.textContent).toBe("Period 9–11");
  });

  it("splits a gapped list into separate blocks", () => {
    render(<PeriodRuns periods={[4, 5, 10]} label="Period" />);
    const root = screen.getByTestId("period-runs");
    expect(root.querySelectorAll("[aria-hidden='true'] > span")).toHaveLength(2);
    expect(root.querySelector(".sr-only")?.textContent).toBe("Period 4–5, 10");
  });

  it("renders nothing without periods", () => {
    const { container } = render(<PeriodRuns periods={[]} label="Period" />);
    expect(container.innerHTML).toBe("");
  });
});
