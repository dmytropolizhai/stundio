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
    if (!selectedTeacher || !selectedTeacher.short) return null;

    const nameParts = selectedTeacher.short.trim().split(/\s+/);

    const firstName = nameParts[1] || "";
    const surname = nameParts[0] || "";

    const displayName = surname ? `${firstName[0]?.toUpperCase() || ""}. ${surname}` : firstName;

    return (
      <Chip
        icon="briefcase"
        onClick={onClick}
        aria-label={t("onboarding.teacher.title")}
        data-testid="class-badge"
      >
        {displayName}
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
      {selectedClass?.short}
    </Chip>
  );
};
