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
}: {
  date: ISODate;
  today: ISODate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (date: ISODate) => void;
  title?: React.ReactNode;
}) => {
  const t = useT();
  const lang = useLang();

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("day.openCalendar")}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md text-left active:scale-(--press-scale)"
        >
          <span>{title ?? dayTitle(date, today, t, lang)}</span>

          <Icon
            name="chevron-down"
            size={22}
            className={cn(
              "text-muted transition-transform duration-(--dur-fast) ease-standard",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent>
        <Calendar
          value={date}
          today={today}
          locale={localeTag(lang)}
          prevMonthLabel={t("day.previousMonth")}
          nextMonthLabel={t("day.nextMonth")}
          onSelect={(picked) => {
            onSelect(picked);
            onOpenChange(false);
          }}
        />

        <div className="mt-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
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
