import { Chip } from "@/ds";
import { useT } from "@/ui/i18n";
import { matchPersona } from "@/lib/persona";
import { usePersona } from "@/ui/persona";
import { useSelectedClass } from "../hooks/useClasses.ts";
import { useSelectedTeacher } from "../hooks/useTeachers.ts";

/** "Surname Firstname" → "F. Surname" — a chip is too narrow for the full name. */
const teacherChipLabel = (short: string): string => {
  const [surname = "", firstName = ""] = short.trim().split(/\s+/);
  return surname ? `${firstName[0]?.toUpperCase() || ""}. ${surname}` : firstName;
};

/**
 * "10.A · Mainīt" (or teacher name) — the tappable counterpart to `SyncBadge`.
 * Freshness says how old the data is; this says whose data it is, and both are one tap away from being fixed.
 */
export const ClassBadge = ({ onClick }: { onClick: () => void }) => {
  const t = useT();
  const { identity, profile } = usePersona();
  const selectedClass = useSelectedClass();
  const selectedTeacher = useSelectedTeacher();

  // `null` hides the chip: a teacher whose record isn't cached has nothing to show yet.
  const label = matchPersona<string | undefined | null>(identity, {
    student: () => selectedClass?.short,
    teacher: () => (selectedTeacher?.short ? teacherChipLabel(selectedTeacher.short) : null),
  });
  if (label === null) return null;

  return (
    <Chip
      icon={profile.icon}
      onClick={onClick}
      aria-label={t(profile.changeIdentityLabel)}
      data-testid="class-badge"
    >
      {label}
    </Chip>
  );
};
