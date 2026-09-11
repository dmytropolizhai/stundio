/**
 * The selected class's collision-aware subject → accent map (DESIGN.md's Index Rule).
 *
 * A thin memoised wrapper over `classSubjectTones` + `useSubjects`, so every screen that paints a
 * subject accent (day list, week grid, subject legend) derives it from the same class subject
 * list and lands on the same colours.
 */
import { useMemo } from "react";
import { classSubjectTones, type SubjectTone } from "../theme/colors.ts";
import { useSubjects } from "./useSubjects.ts";

export const useClassSubjectTones = (): ReadonlyMap<string, SubjectTone> => {
  const { subjects } = useSubjects();

  // `subjects` is already memoised by `useSubjects` on the store data that can change it.
  return useMemo(() => classSubjectTones(subjects.map((s) => s.subject)), [subjects]);
};
