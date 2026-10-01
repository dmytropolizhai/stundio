import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeriodRuns } from "../screens/changes-view/period-runs.tsx";

describe("PeriodRuns", () => {
  it("draws a pair as two fused cells", () => {
    render(<PeriodRuns periods={[9, 10]} label="Period" />);
    const root = screen.getByTestId("period-runs");
    const blocks = root.querySelectorAll("[aria-hidden='true'] > span");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.textContent).toBe("910");
    expect(root.querySelector(".sr-only")?.textContent).toBe("Period 9–10");
  });

  it("collapses a run longer than two to its ends", () => {
    render(<PeriodRuns periods={[1, 2, 3, 4]} label="Period" />);
    const root = screen.getByTestId("period-runs");
    const blocks = root.querySelectorAll("[aria-hidden='true'] > span");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.textContent).toBe("14");
    expect(root.querySelector(".sr-only")?.textContent).toBe("Period 1–4");
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
