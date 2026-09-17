/**
 * The DayView header's date label. The three days a student actually thinks in names —
 * yesterday, today, tomorrow — read as words; anything further out is just a date.
 */
import { addDays } from "@/sync";
import type { ISODate } from "@/lib/edupage";
import { formatDayMonth, type Lang, type Translate } from "@/ui/i18n";

export const dayTitle = (date: ISODate, today: ISODate, t: Translate, lang: Lang): string => {
  if (date === today) return t("day.today");
  if (date === addDays(today, 1)) return t("day.tomorrow");
  if (date === addDays(today, -1)) return t("day.yesterday");
  return formatDayMonth(date, lang);
};
