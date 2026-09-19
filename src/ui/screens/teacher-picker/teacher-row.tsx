import { Badge, Icon } from "@/ds";
import { useT } from "@/ui/i18n";
import type { TeacherOption } from "@/ui/hooks/useTeachers.ts";

type TeacherRowProps = {
  teacher: TeacherOption;
  index: number;
  isSelected: boolean;
  onSelect: (teacher: TeacherOption) => void;
};

export const TeacherRow = ({
  teacher,
  index,
  isSelected,
  onSelect,
}: TeacherRowProps) => {
  const t = useT();
  const displayName = teacher.short || teacher.name;
  const isFormTeacher = teacher.formClassIds.length > 0;

  return (
    <li className={`flex items-center gap-2 pr-4 ${index === 0 ? "" : "border-t border-hairline"}`}>
      <button
        type="button"
        onClick={() => onSelect(teacher)}
        aria-pressed={isSelected}
        className={`flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 border-0 bg-transparent px-4 py-3.5 text-left transition-colors ${
          isSelected ? "text-brand-strong" : "text-strong"
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-text text-body font-bold truncate">{displayName}</span>
          {teacher.name && teacher.short && teacher.name !== teacher.short && (
            <span className="truncate font-text text-caption text-muted">
              {teacher.name}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isFormTeacher && (
            <Badge tone="quiet" uppercase={false}>
              {t("teacher.formClass")}
            </Badge>
          )}
          {isSelected && (
            <Icon name="check" size={18} className="text-brand-strong" />
          )}
        </div>
      </button>
    </li>
  );
};
