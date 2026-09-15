import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { isIosDevice, isStandalonePwa } from "../lib/platform.ts";

export type IphoneInstallPrompt = {
  open: boolean;
  show: () => void;
  dismiss: () => void;
};

/**
 * Manages when the "Add to Home Screen" prompt opens for iPhone Safari users.
 *
 * Rules:
 * - Automatically opens once on launch when on an iOS device in browser mode (not standalone).
 * - Does not re-open once marked dismissed in settings.
 * - Can be manually reopened from Settings → Sharing / Install.
 */
export const useIphoneInstallPrompt = (): IphoneInstallPrompt => {
  const ready = useAppStore((s) => s.ready);
  const dismissed = useAppStore((s) => s.settings.iphoneInstallPromptDismissed);
  const setDismissed = useAppStore((s) => s.setIphoneInstallPromptDismissed);

  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!ready || dismissed || autoOpenedRef.current) return;
    if (!isIosDevice() || isStandalonePwa()) return;

    autoOpenedRef.current = true;
    setOpen(true);
  }, [ready, dismissed]);

  const dismiss = useCallback(() => {
    setOpen(false);
    if (!dismissed) void setDismissed(true);
  }, [dismissed, setDismissed]);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  return { open, show, dismiss };
};
