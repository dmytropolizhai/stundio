import type { ISODate } from "@/lib/edupage";
import type { TomorrowPreview } from "@/lib/schedule";
import { Card } from "@/ds";
import { formatWeekdayLong, useLang, useT } from "@/ui/i18n";
import { lessonHeading } from "@/ui/components/lesson-heading.ts";

type DayTomorrowProps = {
  date: ISODate;
  preview: TomorrowPreview;
  onOpen: () => void;
};

/** Shown once today's lessons are over: when the next school day starts, and what changed. */
export const DayTomorrow = ({ date, preview, onOpen }: DayTomorrowProps) => {
  const t = useT();
  const lang = useLang();
  const { title, rooms, isTeacherMode } = lessonHeading(preview.first);

  return (
    <Card tone="surface" radius="xl" className="mt-3" data-testid="day-tomorrow" onClick={onOpen}>
      <span className="u-eyebrow">
        {t("day.tomorrow.eyebrow", { weekday: formatWeekdayLong(date, lang) })}
      </span>
      <h2 className="mt-1 font-display text-display-2 tracking-display text-strong">
        {t("day.tomorrow.starts", { time: preview.start })}
      </h2>
      <p className="font-text text-body text-fg">
        {title}
        {!isTeacherMode && rooms !== "" ? ` · ${rooms}` : ""}
      </p>
      {preview.changedCount > 0 && (
        <p className="mt-2 font-text text-caption font-bold text-warning">
          {t("day.tomorrow.changes", { count: preview.changedCount })}
        </p>
      )}
    </Card>
  );
};
