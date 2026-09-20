import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { useTeachers, type TeacherOption } from "@/ui/hooks/useTeachers.ts";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { TeacherSearch } from "./teacher-search.tsx";
import { TeacherList } from "./teacher-list.tsx";

type TeacherPickerProps = {
  onPicked?: () => void;
};

export const TeacherPicker = ({ onPicked }: TeacherPickerProps) => {
  const teachers = useTeachers();
  const selected = useAppStore((s) => s.settings.selectedTeacherId);
  const setTeacher = useAppStore((s) => s.setTeacher);
  const setPersona = useAppStore((s) => s.setPersona);
  const refresh = useAppStore((s) => s.refresh);

  const [query, setQuery] = useState("");

  useEffect(() => {
    if (teachers.length === 0) {
      void refresh();
    }
  }, [teachers.length, refresh]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (needle === "") {
      return teachers;
    }

    return teachers.filter(
      (t) =>
        t.short.toLowerCase().includes(needle) ||
        t.name.toLowerCase().includes(needle),
    );
  }, [teachers, query]);

  const pick = (teacher: TeacherOption) => {
    void setPersona("teacher");
    void setTeacher(teacher.id);
    onPicked?.();
  };

  if (teachers.length === 0) {
    return <StateMessage icon="cloud" title="Loading" hint="Please wait..." />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TeacherSearch value={query} onChange={setQuery} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-gutter pb-26">
        <TeacherList
          teachers={matches}
          selected={selected}
          onSelect={pick}
        />
      </div>
    </div>
  );
};
