/**
 * University naming in the UI: which of the university's own names to show (Settings, `auto`
 * following the app language), and an RTU group's label said in the app's language — RTU
 * publishes a group as a course and a number, so "1. kurss · 2. grupa" can become
 * "Year 1 · Group 2". An LU group's label is the university's own text and stays as published.
 */
import { useAppStore } from "@/store";
import {
  resolveUniversityNames,
  type UniversityGroupRef,
  type UniversityNames,
} from "@/lib/university";
import type { Translate } from "@/ui/i18n";

export const useUniversityNames = (): UniversityNames => {
  const setting = useAppStore((s) => s.settings.universityNames);
  const lang = useAppStore((s) => s.settings.lang);
  return resolveUniversityNames(setting, lang);
};

export const formatUniversityGroup = (group: UniversityGroupRef, t: Translate): string => {
  if (group.course === undefined || group.number === undefined) return group.label;
  const code = group.label.split(" · ")[0] ?? "";
  return t("university.rtuGroup", { code, course: group.course, group: group.number });
};
