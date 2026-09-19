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
