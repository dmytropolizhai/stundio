/**
 * "Did today actually change?" — compares two substitution snapshots for the same date,
 * ignoring `fetchedAt` (every sync rewrites that). Used to decide whether a refresh earns a
 * "changed" notification, not just a routine no-op re-fetch.
 */
import type { DaySubstitutions } from "../edupage/index.ts";

const fingerprint = (day: DaySubstitutions | null): string =>
  day === null ? "" : JSON.stringify({ notes: day.notes, items: day.items });

export const substitutionsChanged = (
  before: DaySubstitutions | null,
  after: DaySubstitutions | null,
): boolean => fingerprint(before) !== fingerprint(after);
