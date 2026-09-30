import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";

export type TeacherAnnouncement = {
  open: boolean;
  show: () => void;
  dismiss: () => void;
};

export const useTeacherAnnouncement = (): TeacherAnnouncement => {
  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const selectedTeacherId = useAppStore((s) => s.settings.selectedTeacherId);
  const dismissed = useAppStore((s) => s.settings.teacherAnnouncementDismissed);
  const setDismissed = useAppStore((s) => s.setTeacherAnnouncementDismissed);
  const persona = useAppStore((s) => s.settings.persona);

  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!ready || dismissed || autoOpenedRef.current) return;
    // Auto-open only if onboarded and not already a teacher (if already teacher, they know)
    const isOnboarded =
      persona === "teacher" ? selectedTeacherId !== null : selectedClassId !== null;
    if (!isOnboarded || persona === "teacher") return;

    autoOpenedRef.current = true;
    setOpen(true);
  }, [ready, selectedClassId, selectedTeacherId, dismissed, persona]);

  const dismiss = useCallback(() => {
    setOpen(false);
    if (!dismissed) void setDismissed(true);
  }, [dismissed, setDismissed]);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  return { open, show, dismiss };
};
