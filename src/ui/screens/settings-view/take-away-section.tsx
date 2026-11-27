import { useT } from "@/ui/i18n";
import { CalendarRows } from "./calendar-section.tsx";
import { Section } from "./settings-section.tsx";
import { TeacherShareRow } from "./share-section.tsx";

type TakeAwaySectionProps = {
  onShowTeacherAnnouncement?: (() => void) | undefined;
};

/**
 * Everything that gets the timetable out of the app — into a calendar, or to the class — in one
 * group, because "put it somewhere else" is one intention, not two.
 */
export const TakeAwaySection = ({ onShowTeacherAnnouncement }: TakeAwaySectionProps) => {
  const t = useT();
  return (
    <Section title={t("settings.share")}>
      <CalendarRows />
      {onShowTeacherAnnouncement !== undefined && (
        <TeacherShareRow onClick={onShowTeacherAnnouncement} />
      )}
    </Section>
  );
};
