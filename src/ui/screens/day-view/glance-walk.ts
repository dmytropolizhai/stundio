import type { DayGlance } from "@/lib/schedule";
import type { ResolvedLesson } from "@/lib/edupage";

/** The hop the glance warns about, if any: where to walk, and from where (null = from here). */
export const glanceWalk = (
  glance: Exclude<DayGlance, { kind: "finished" }>,
): { to: ResolvedLesson; from: string | null } | null => {
  if (glance.kind === "live") {
    return glance.followingHop && glance.following !== null
      ? { to: glance.following, from: null }
      : null;
  }

  return glance.hop ? { to: glance.lesson, from: glance.from } : null;
};
