/** Exercise Transit in the real app shell, including the role-change tab guard. */
import { afterEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "../../App.tsx";
import { bootApp } from "@/store/boot.ts";
import { bootHarness, clickAndSettle } from "./harness.tsx";

vi.mock("@/store/boot.ts", () => ({ bootApp: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

it("opens Transit and returns home when the selected role loses the Transit tab", async () => {
  const harness = await bootHarness({
    lang: "en",
    teacherAnnouncementDismissed: true,
    lastSeenChangelogVersion: __APP_VERSION__,
    iphoneInstallPromptDismissed: true,
  });
  vi.mocked(bootApp).mockResolvedValue({ store: harness.store });
  await act(async () => {
    render(<App />);
    await Promise.resolve();
  });
  fireEvent.click(screen.getByRole("button", { name: "Transit" }));
  expect(screen.getByTitle("Rīgas satiksme live transit map")).toBeDefined();
  const teacher = Object.values(harness.store.getState().timetables)[0]?.teachers[0];
  await clickAndSettle(() => {
    void harness.store.getState().setTeacher(teacher?.id ?? "teacher");
  });
  await clickAndSettle(() => {
    void harness.store.getState().setPersona("teacher");
  });
  expect(screen.queryByTitle("Rīgas satiksme live transit map")).toBeNull();
  expect(screen.queryByRole("button", { name: "Transit" })).toBeNull();
  expect(screen.getByRole("button", { name: "Home" }).getAttribute("aria-current")).toBe("page");
});

it("opens the teacher list, not the language screen, when switching to a role with no pick yet", async () => {
  const harness = await bootHarness({
    lang: "en",
    teacherAnnouncementDismissed: true,
    lastSeenChangelogVersion: __APP_VERSION__,
    iphoneInstallPromptDismissed: true,
  });
  vi.mocked(bootApp).mockResolvedValue({ store: harness.store });
  await act(async () => {
    render(<App />);
    await Promise.resolve();
  });
  await clickAndSettle(() => {
    void harness.store.getState().setPersona("teacher");
  });
  expect(screen.getByText("Select teacher")).toBeDefined();
  expect(screen.queryByText("Choose your language")).toBeNull();
});
