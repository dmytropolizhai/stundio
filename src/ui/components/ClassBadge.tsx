import { Chip } from "../../ds/index.ts";
import { useT } from "../i18n/index.ts";
import { useSelectedClass } from "../hooks/useClasses.ts";

/**
 * "10.A · Mainīt" — the tappable counterpart to `SyncBadge`. Freshness says how old the data is;
 * this says whose data it is, and both are one tap away from being fixed. Sits opposite the
 * screen title in `TopBar`'s `actions` slot, since the eyebrow above the title already carries the
 * class name and this is the control that changes it, not a second label for it.
 */
export const ClassBadge = ({ onClick }: { onClick: () => void }) => {
  const t = useT();
  const selectedClass = useSelectedClass();

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
