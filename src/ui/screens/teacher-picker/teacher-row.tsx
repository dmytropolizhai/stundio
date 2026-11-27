import { Badge, cn } from "@/ds";
import { useT } from "@/ui/i18n";
import type { TeacherOption } from "@/ui/hooks/useTeachers.ts";
import { teacherDisplayName } from "./group-teachers.ts";

type TeacherRowProps = {
  teacher: TeacherOption;
  isSelected: boolean;
  onSelect: (teacher: TeacherOption) => void;
};

/**
 * Tactile teacher tile inside an alphabetical liquid-glass slab.
 * Selection performs a full Night / Day inverse fill swap (`bg-inverse text-on-inverse`).
 */
export const TeacherRow = ({ teacher, isSelected, onSelect }: TeacherRowProps) => {
  const t = useT();
  const displayName = teacherDisplayName(teacher);
  const isFormTeacher = teacher.formClassIds.length > 0;
  const distinctFullName =
    teacher.name !== "" && teacher.short !== "" && teacher.name !== teacher.short
      ? teacher.name
      : null;
  const subtitleParts = [
    ...(distinctFullName !== null ? [distinctFullName] : []),
    ...teacher.buildings,
  ];
  const subtitle = subtitleParts.join(" · ");

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={() => {
          onSelect(teacher);
        }}
        aria-pressed={isSelected}
        className={cn(
          "flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border-0 px-3.5 py-2.5 text-left",
          "transition-[background-color,color,transform] duration-(--dur-fast) ease-(--ease-standard)",
          "active:scale-(--press-scale-tile) active:duration-(--dur-instant)",
          "focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
          isSelected
            ? "bg-inverse text-on-inverse shadow-card"
            : "bg-transparent text-strong hover:bg-(--schedule-row-hover)",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-text text-body leading-snug font-bold">{displayName}</span>
          {subtitle !== "" && (
            <span
              className={cn(
                "mt-0.5 truncate font-text text-micro leading-tight font-medium",
                isSelected ? "text-on-inverse/75" : "text-muted",
              )}
            >
              {subtitle}
            </span>
          )}
        </div>

        {isFormTeacher && (
          <Badge
            tone="quiet"
            uppercase={false}
            className={cn("shrink-0", isSelected && "bg-on-inverse/14 text-on-inverse")}
          >
            {t("teacher.formClass")}
          </Badge>
        )}
      </button>
    </li>
  );
};
