/**
 * Total count of changed lessons for today and later days, using the same predicate as
 * `ChangesView` (`status !== "normal" || isCover === true`). Drives the Changes badge in the
 * phone bottom bar without recomputing from the Home screen.
 */
import { useMemo } from "react";
import { useAppStore } from "@/store";
import { usePersona } from "@/ui/persona";
import { useNow } from "./useNow.ts";

export const useChangesCount = (): number => {
  const now = useNow();
  const ready = useAppStore((s) => s.ready);
  const { identified, key: identityKey } = usePersona();
  const resolvedDay = useAppStore((s) => s.resolvedDay);
  const timetables = useAppStore((s) => s.timetables);
  const substitutions = useAppStore((s) => s.substitutions);

  return useMemo(() => {
    if (!ready || !identified) return 0;

    let count = 0;
    for (const date of Object.keys(substitutions)) {
      if (date < now.date) continue;
      const day = resolvedDay(date);
      if (day === null) continue;
      for (const lesson of day.lessons) {
        if (lesson.status !== "normal" || lesson.isCover === true) {
          count += 1;
        }
      }
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `timetables` and `identityKey` invalidate `resolvedDay`
  }, [ready, identified, now.date, resolvedDay, timetables, substitutions, identityKey]);
};
