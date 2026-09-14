/**
 * "Did today actually change?" — compares two substitution snapshots for the same date,
 * ignoring `fetchedAt` (every sync rewrites that). Used to decide whether a refresh earns a
 * "changed" notification, not just a routine no-op re-fetch.
 *
 * A day with no notes and no items fingerprints the same as `null`: `daysToRefresh` slides a
 * fresh date into the sync window every day, so its first-ever fetch has no cached "before" —
 * without this, an empty (nothing-to-report) day would still read as "changed" purely because
 * it had never been cached, firing a notification with nothing behind it every single day.
 */
import type { DaySubstitutions } from "@/lib/edupage";

const fingerprint = (day: DaySubstitutions | null): string =>
  day === null || (day.notes.length === 0 && day.items.length === 0)
    ? ""
    : JSON.stringify({ notes: day.notes, items: day.items });

export const substitutionsChanged = (
  before: DaySubstitutions | null,
  after: DaySubstitutions | null,
): boolean => fingerprint(before) !== fingerprint(after);
