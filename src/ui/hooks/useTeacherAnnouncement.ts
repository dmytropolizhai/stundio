import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { usePersona } from "@/ui/persona";

export type TeacherAnnouncement = {
  open: boolean;
  show: () => void;
  dismiss: () => void;
};

export const useTeacherAnnouncement = (): TeacherAnnouncement => {
  const ready = useAppStore((s) => s.ready);
  const { identified, profile } = usePersona();
  const dismissed = useAppStore((s) => s.settings.teacherAnnouncementDismissed);
  const setDismissed = useAppStore((s) => s.setTeacherAnnouncementDismissed);

  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!ready || dismissed || autoOpenedRef.current) return;
    // Only once onboarded, and only for a role the announcement is news to.
    if (!identified || !profile.seesTeacherAnnouncement) return;

    autoOpenedRef.current = true;
    setOpen(true);
  }, [ready, identified, profile, dismissed]);

  const dismiss = useCallback(() => {
    setOpen(false);
    if (!dismissed) void setDismissed(true);
  }, [dismissed, setDismissed]);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  return { open, show, dismiss };
};
