/**
 * "Did *my* day actually change?" — compares two substitution snapshots for the same date,
 * ignoring `fetchedAt` (every sync rewrites that). Used to decide whether a refresh earns a
 * "changed" notification, not just a routine no-op re-fetch.
 *
 * A day with nothing to report fingerprints the same as `null`: `daysToRefresh` slides a fresh
 * date into the sync window every day, so its first-ever fetch has no cached "before" — without
 * this, an empty (nothing-to-report) day would still read as "changed" purely because it had
 * never been cached, firing a notification with nothing behind it every single day.
 *
 * The feed is school-wide, so the comparison MUST be narrowed to the class the user picked.
 * Fingerprinting the whole document means every other class's substitutions — dozens a day at
 * RVT — read as "your timetable changed", which is the notification spam this scoping exists to
 * kill. `className` is the display short ("A1-2") the substitution rows are keyed by, exactly
 * as `resolveDay` matches them; `null` means "no class picked", which nobody can have a changed
 * timetable for, so nothing is ever a change.
 */
import { filterNotesForClass, type DaySubstitutions } from "@/lib/edupage";

/**
 * The rows and announcements this class would actually see, in a stable, `fetchedAt`-free
 * shape. Notes go through the same relevance filter the UI renders them behind, so a
 * school-wide announcement aimed at another year group is not a change either.
 */
const fingerprint = (day: DaySubstitutions | null, className: string | null): string => {
  if (day === null || className === null || className === "") return "";

  const items = day.items.filter((item) => item.className === className);
  // The feed's own class list is enough of a vocabulary for the "2.kurss:"-style prefixes
  // `filterNotesForClass` looks for; the timetable's roster lives a layer away from here.
  const allClasses = [...new Set(day.items.map((item) => item.className).filter(Boolean))];
  const notes = filterNotesForClass(day.notes, className, allClasses).relevant;

  return items.length === 0 && notes.length === 0 ? "" : JSON.stringify({ notes, items });
};

export const substitutionsChanged = (
  before: DaySubstitutions | null,
  after: DaySubstitutions | null,
  className: string | null,
): boolean => fingerprint(before, className) !== fingerprint(after, className);
