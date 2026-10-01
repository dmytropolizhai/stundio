/**
 * Maps the substitution grammar's `kind` (MODEL.md §5) onto the `ResolvedStatus`
 * vocabulary the status badges speak, so the "all school" list can reuse the same
 * badge component as the resolved-lesson list.
 */
import type { ResolvedStatus, SubstKind } from "@/lib/edupage";

export const substKindToStatus = (kind: SubstKind): ResolvedStatus => {
  switch (kind) {
    case "cancelled":
      return "cancelled";
    case "moved_in":
    case "moved_out":
      return "moved";
    case "substitution":
      return "substituted";
    case "room_change":
      return "room_change";
    case "added":
      return "added";
    default:
      return "substituted";
  }
};

/** The "was ➔ now" separator shared by both change lists. */
export const ARROW = "\u2794";

/**
 * Splits a substitution's period list into runs of consecutive periods, so
 * `[4, 5, 10, 11, 12]` renders as two fused blocks rather than one long string.
 * Input order and duplicates from the parser are tolerated.
 */
export const periodRuns = (periods: readonly number[]): number[][] => {
  const sorted = [...new Set(periods)].sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const period of sorted) {
    const run = runs.at(-1);
    if (run !== undefined && run.at(-1) === period - 1) run.push(period);
    else runs.push([period]);
  }
  return runs;
};
