import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { isIosDevice } from "../lib/platform.ts";

export type IphoneAnnouncement = {
  open: boolean;
  show: () => void;
  dismiss: () => void;
};

/**
 * Manages when the iPhone release announcement modal auto-opens on startup.
 *
 * Rules:
 * - Opens once on startup after onboarding (when `ready` is true and a class is selected).
 * - Does not re-open once marked dismissed in settings.
 * - Can be manually reopened from Settings → Sharing.
 */
export const useIphoneAnnouncement = (): IphoneAnnouncement => {
  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const dismissed = useAppStore((s) => s.settings.iphoneAnnouncementDismissed);
  const setDismissed = useAppStore((s) => s.setIphoneAnnouncementDismissed);

  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!ready || selectedClassId === null || dismissed || autoOpenedRef.current) return;
    if (isIosDevice()) return;
    autoOpenedRef.current = true;
    setOpen(true);
  }, [ready, selectedClassId, dismissed]);

  const dismiss = useCallback(() => {
    setOpen(false);
    if (!dismissed) void setDismissed(true);
  }, [dismissed, setDismissed]);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  return { open, show, dismiss };
};
