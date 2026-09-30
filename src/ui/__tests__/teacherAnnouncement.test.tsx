import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StoreContext } from "@/store";
import { bootHarness } from "./harness.tsx";
import { useTeacherAnnouncement } from "../hooks/useTeacherAnnouncement.ts";
import { TeacherAnnouncementSheet } from "../screens/sheets/TeacherAnnouncementSheet.tsx";
import { SettingsView } from "../screens/settings-view";

describe("Teacher announcement", () => {
  describe("startup announcement hook", () => {
    const TestComponent = ({ onOpen }: { onOpen?: () => void }) => {
      const announcement = useTeacherAnnouncement();
      return (
        <>
          <button type="button" onClick={announcement.show}>
            show-announcement
          </button>
          <TeacherAnnouncementSheet
            open={announcement.open}
            onClose={() => {
              announcement.dismiss();
              onOpen?.();
            }}
          />
        </>
      );
    };

    it("auto-opens on launch if announcement has not been dismissed and user is student", async () => {
      const harness = await bootHarness({ teacherAnnouncementDismissed: false, selectedClassId: "class-1" });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      expect(screen.getByText("Tagad pieejams arī skolotājiem")).toBeDefined();
    });

    it("does not auto-open if already dismissed", async () => {
      const harness = await bootHarness({ teacherAnnouncementDismissed: true, selectedClassId: "class-1" });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      expect(screen.queryByText("Tagad pieejams arī skolotājiem")).toBeNull();
    });

    it("persists dismissal when user taps 'Sapratu' (Got it)", async () => {
      const harness = await bootHarness({ teacherAnnouncementDismissed: false, selectedClassId: "class-1" });
      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <TestComponent />
          </StoreContext.Provider>,
        );
      });

      const dismissBtn = screen.getByText("Sapratu");
      act(() => {
        fireEvent.click(dismissBtn);
      });

      expect(harness.store.getState().settings.teacherAnnouncementDismissed).toBe(true);
    });
  });

  describe("SettingsView integration", () => {
    it("renders teacher share row in Settings and calls onShowTeacherAnnouncement", async () => {
      const onShowTeacherAnnouncement = vi.fn();
      const harness = await bootHarness();

      act(() => {
        render(
          <StoreContext.Provider value={harness.store}>
            <SettingsView
              onPickClass={vi.fn()}
              onPickTeacher={vi.fn()}
              onShowWhatsNew={vi.fn()}
              onShowTeacherAnnouncement={onShowTeacherAnnouncement}
            />
          </StoreContext.Provider>,
        );
      });

      expect(screen.getByText("Paziņojums skolotājiem")).toBeDefined();
      const shareButton = screen.getAllByRole("button", { name: /Skatīt/i })[0];
      expect(shareButton).toBeDefined();

      if (shareButton) {
        act(() => {
          fireEvent.click(shareButton);
        });
        expect(onShowTeacherAnnouncement).toHaveBeenCalled();
      }
    });
  });
});
