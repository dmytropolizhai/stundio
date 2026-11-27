/**
 * The design system's ThemePicker and the Settings group look it sits in: three thumbnails drawn
 * in their own theme, one chosen, a radio group the keyboard can walk; and group titles in
 * sentence case, not the all-caps eyebrow.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemePicker, type ThemePickerOption } from "@/ds";
import { Section } from "../screens/settings-view/settings-section.tsx";

type Key = "system" | "light" | "dark";
const OPTIONS: readonly ThemePickerOption<Key>[] = [
  { key: "system", label: "Sistēma", preview: "split" },
  { key: "light", label: "Diena", preview: "light" },
  { key: "dark", label: "Nakts", preview: "dark" },
];

const renderPicker = (value: Key = "system", onChange = vi.fn()) => {
  render(<ThemePicker label="Tēma" options={OPTIONS} value={value} onChange={onChange} />);
  return onChange;
};

describe("ThemePicker", () => {
  it("is a named radio group with the chosen thumbnail checked and alone in the tab order", () => {
    renderPicker("light");
    expect(screen.getByRole("radiogroup", { name: "Tēma" })).toBeDefined();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it("draws each thumbnail in its own theme, and System as half of each", () => {
    renderPicker();
    const [system, light, dark] = screen.getAllByRole("radio");
    expect(system?.querySelectorAll(".force-light")).toHaveLength(1);
    expect(system?.querySelectorAll(".force-dark")).toHaveLength(1);
    expect(light?.querySelector(".force-light")).not.toBeNull();
    expect(light?.querySelector(".force-dark")).toBeNull();
    expect(dark?.querySelector(".force-dark")).not.toBeNull();
    expect(dark?.querySelector(".force-light")).toBeNull();
  });

  it("marks the choice with a check and picks on click", () => {
    const onChange = renderPicker("dark");
    const [system, light, dark] = screen.getAllByRole("radio");
    // The thumbnail's own svg, plus the check only on the chosen one.
    expect(dark?.querySelectorAll("svg")).toHaveLength(2);
    expect(light?.querySelectorAll("svg")).toHaveLength(1);
    expect(system?.querySelectorAll("svg")).toHaveLength(2 /* two halves */);
    fireEvent.click(screen.getByRole("radio", { name: "Diena" }));
    expect(onChange).toHaveBeenCalledWith("light");
  });

  it("walks the choice with the arrow keys and wraps", () => {
    const onChange = renderPicker("dark");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Nakts" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("system");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Nakts" }), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("light");
  });
});

describe("Settings group", () => {
  it("titles a group in sentence case, not the all-caps eyebrow", () => {
    render(
      <Section title="Paziņojumi">
        <div>row</div>
      </Section>,
    );
    const heading = screen.getByRole("heading", { name: "Paziņojumi" });
    expect(heading.className).not.toContain("u-eyebrow");
    expect(heading.className).toContain("font-semibold");
  });
});
