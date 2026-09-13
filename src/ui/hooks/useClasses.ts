/**
 * The class catalogue, merged across every cached timetable.
 *
 * There is one timetable per building (CLAUDE.md), and a class appears only in its own
 * building's — so the merge is also what tells the picker which building a class sits in.
 */
import { useMemo } from "react";
import { useAppStore } from "@/store";
import type { Building, ClassRef } from "@/lib/edupage";

export type ClassOption = ClassRef & { buildings: Building[] };

export const useClasses = (): ClassOption[] => {
  // Selecting the record (a stable reference) and deriving here — a selector that built a
  // new array every call would make `useSyncExternalStore` re-render forever.
  const timetables = useAppStore((s) => s.timetables);

  return useMemo(() => {
    const byId = new Map<string, ClassOption>();
    for (const timetable of Object.values(timetables)) {
      for (const cls of timetable.classes) {
        if (cls.name !== "" && cls.short !== "") {
          const existing = byId.get(cls.id);
          if (existing === undefined) {
            byId.set(cls.id, { ...cls, buildings: [timetable.meta.building] });
          } else if (!existing.buildings.includes(timetable.meta.building)) {
            existing.buildings.push(timetable.meta.building);
          }
        }
      }
    }
    return [...byId.values()].sort((a, b) => a.short.localeCompare(b.short, "lv"));
  }, [timetables]);
};

export const useSelectedClass = (): ClassOption | null => {
  const classes = useClasses();
  const selected = useAppStore((s) => s.settings.selectedClassId);
  return useMemo(
    () => (selected === null ? null : (classes.find((c) => c.id === selected) ?? null)),
    [classes, selected],
  );
};
