import { Icon } from "@/ds/components/ui/icon";
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger, cn } from "@/ds";
import { localeTag, useLang, useT } from "@/ui/i18n";
import { dayTitle } from "../lib/dayTitle.ts";
import type { ISODate } from "@/lib/edupage";

export const DatePicker = ({
  date,
  today,
  open,
  onOpenChange,
  onSelect,
  title,
  range,
  align = "start",
  iconSize = 22,
  className,
}: {
  date: ISODate;
  today: ISODate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (date: ISODate) => void;
  title?: React.ReactNode;
  /** Optional inclusive `[start, end]` range to highlight in the calendar (e.g. active week). */
  range?: readonly [ISODate, ISODate];
  align?: "start" | "center" | "end";
  iconSize?: number;
  className?: string;
}) => {
  const t = useT();
  const lang = useLang();

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("day.openCalendar")}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1 rounded-md text-left active:scale-(--press-scale)",
            className,
          )}
        >
          <span className="truncate first-letter:uppercase">
            {title ?? dayTitle(date, today, t, lang)}
          </span>

          <Icon
            name="chevron-down"
            size={iconSize}
            className={cn(
              "text-muted transition-transform duration-(--dur-fast) ease-standard",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align={align} className="p-3.5">
        <Calendar
          value={date}
          today={today}
          {...(range !== undefined ? { range } : {})}
          locale={localeTag(lang)}
          prevMonthLabel={t("day.previousMonth")}
          nextMonthLabel={t("day.nextMonth")}
          onSelect={(picked) => {
            onSelect(picked);
            onOpenChange(false);
          }}
        />

        <div className="mt-3">
          <Button
            variant={date === today ? "ghost" : "outline"}
            size="sm"
            block
            data-testid="calendar-jump-today"
            onClick={() => {
              onSelect(today);
              onOpenChange(false);
            }}
          >
            {t("day.jumpToday")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
