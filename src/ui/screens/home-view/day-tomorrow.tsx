import type { ISODate } from "@/lib/edupage";
import type { TomorrowPreview } from "@/lib/schedule";
import { Badge, Icon } from "@/ds";
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
  const weekday = formatWeekdayLong(date, lang);

  return (
    <button
      type="button"
      className="u-schedule-glass mt-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left transition-transform duration-(--dur-instant) ease-(--ease-out) active:scale-(--press-scale-tile)"
      data-testid="day-tomorrow"
      aria-label={t("day.tomorrow.open", {
        weekday,
        time: preview.start,
      })}
      onClick={onOpen}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="m-0 font-display text-title leading-tight font-bold tracking-display text-strong">
            {t("day.tomorrow.starts", { time: preview.start })}
          </h2>
          <span className="font-text text-caption font-medium text-muted first-letter:uppercase">
            {weekday}
          </span>
        </div>
        <p className="mt-1 truncate font-text text-body text-fg">
          {title}
          {!isTeacherMode && rooms !== "" ? ` · ${rooms}` : ""}
        </p>
        {preview.changedCount > 0 && (
          <Badge tone="warning" uppercase={false} className="mt-2">
            {t("day.tomorrow.changes", { count: preview.changedCount })}
          </Badge>
        )}
      </div>
      <Icon name="chevron-right" size={18} className="shrink-0 text-muted" />
    </button>
  );
};
