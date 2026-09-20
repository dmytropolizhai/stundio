import { Card } from "@/ds";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { useT } from "@/ui/i18n";
import type { TeacherOption } from "@/ui/hooks/useTeachers.ts";
import { TeacherRow } from "./teacher-row.tsx";

type TeacherListProps = {
  teachers: TeacherOption[];
  selected: string | null;
  onSelect: (teacher: TeacherOption) => void;
};

export const TeacherList = ({ teachers, selected, onSelect }: TeacherListProps) => {
  const t = useT();

  if (teachers.length === 0) {
    return <StateMessage icon="search" title={t("teacher.none")} />;
  }

  return (
    <Card className="overflow-hidden">
      <ul>
        {teachers.map((teacher, index) => (
          <TeacherRow
            key={teacher.id}
            teacher={teacher}
            index={index}
            isSelected={teacher.id === selected}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </Card>
  );
};
