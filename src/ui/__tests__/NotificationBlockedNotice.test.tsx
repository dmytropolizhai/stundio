/**
 * The Home notice for a blocked notification permission: hidden unless denied, text-only in a
 * browser (no API can reopen its site settings), and a settings deep-link button on Android.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const native = vi.hoisted(() => ({
  isNative: false,
  denied: false,
  openSettings: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/edupage", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, isNativePlatform: () => native.isNative };
});
vi.mock("@/notifications/localNotifications", () => ({
  isNotificationPermissionDenied: () => Promise.resolve(native.denied),
  openNotificationSettings: native.openSettings,
}));

import { StoreContext } from "@/store";
import { NotificationBlockedNotice } from "../components/NotificationBlockedNotice.tsx";
import { bootHarness } from "./harness.tsx";

const renderNotice = async () => {
  const harness = await bootHarness();
  return render(
    <StoreContext.Provider value={harness.store}>
      <NotificationBlockedNotice />
    </StoreContext.Provider>,
  );
};

const stubBrowserPermission = (permission: NotificationPermission) => {
  vi.stubGlobal("Notification", { permission });
};

describe("NotificationBlockedNotice", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    native.isNative = false;
    native.denied = false;
    native.openSettings.mockClear();
  });

  it("renders nothing while the browser permission is not denied", async () => {
    stubBrowserPermission("default");
    await renderNotice();
    expect(screen.queryByTestId("notify-blocked")).toBeNull();
  });

  it("explains a browser denial without offering a button", async () => {
    stubBrowserPermission("denied");
    await renderNotice();
    expect(screen.getByTestId("notify-blocked")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers an open-settings button on Android when the OS permission is denied", async () => {
    native.isNative = true;
    native.denied = true;
    await renderNotice();

    fireEvent.click(await screen.findByRole("button"));
    expect(native.openSettings).toHaveBeenCalledOnce();
  });
});
