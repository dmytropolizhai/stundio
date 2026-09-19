import { Chip } from "@/ds";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { useSelectedClass } from "../hooks/useClasses.ts";
import { useSelectedTeacher } from "../hooks/useTeachers.ts";

/**
 * "10.A · Mainīt" (or teacher name) — the tappable counterpart to `SyncBadge`.
 * Freshness says how old the data is; this says whose data it is, and both are one tap away from being fixed.
 */
export const ClassBadge = ({ onClick }: { onClick: () => void }) => {
  const t = useT();
  const persona = useAppStore((s) => s.settings.persona);
  const selectedClass = useSelectedClass();
  const selectedTeacher = useSelectedTeacher();

  if (persona === "teacher") {
    return (
      <Chip
        icon="briefcase"
        onClick={onClick}
        aria-label={t("onboarding.teacher.title")}
        data-testid="class-badge"
      >
        {selectedTeacher?.short ?? selectedTeacher?.name ?? t("app.title")}
      </Chip>
    );
  }

  return (
    <Chip
      icon="graduation-cap"
      onClick={onClick}
      aria-label={t("day.changeClass")}
      data-testid="class-badge"
    >
      {selectedClass?.short ?? t("app.title")}
    </Chip>
  );
};
