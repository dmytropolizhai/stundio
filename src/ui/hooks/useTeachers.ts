import { useMemo } from "react";
import { useAppStore } from "@/store";
import { listTeachers, type Building, type TeacherRef } from "@/lib/edupage";

export type TeacherOption = TeacherRef & {
  buildings: Building[];
  formClassIds: string[];
};

export const useTeachers = (): TeacherOption[] => {
  const timetables = useAppStore((s) => s.timetables);

  return useMemo(() => {
    return listTeachers(Object.values(timetables));
  }, [timetables]);
};

export const useSelectedTeacher = (): TeacherOption | null => {
  const teachers = useTeachers();
  const selectedId = useAppStore((s) => s.settings.selectedTeacherId);
  return useMemo(
    () => (selectedId === null ? null : (teachers.find((t) => t.id === selectedId) ?? null)),
    [teachers, selectedId],
  );
};
