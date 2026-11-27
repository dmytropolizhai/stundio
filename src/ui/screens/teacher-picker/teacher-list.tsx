import { useMemo, type ReactNode } from "react";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { useT } from "@/ui/i18n";
import type { TeacherOption } from "@/ui/hooks/useTeachers.ts";
import { TeacherRow } from "./teacher-row.tsx";
import { groupTeachersByInitial } from "./group-teachers.ts";

type TeacherListProps = {
  teachers: TeacherOption[];
  selected: string | null;
  onSelect: (teacher: TeacherOption) => void;
};

/**
 * Alphabetical A–Z liquid-glass slabs for teacher selection.
 * Uses a 1-column full-width list on phones so full names stay legible, expanding to 2 columns
 * on tablet/desktop.
 */
export const TeacherList = ({ teachers, selected, onSelect }: TeacherListProps) => {
  const t = useT();
  const initialGroups = useMemo(() => groupTeachersByInitial(teachers), [teachers]);

  if (teachers.length === 0) {
    return (
      <div className="pt-4">
        <StateMessage icon="search" title={t("teacher.none")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      {initialGroups.map((group) => (
        <GlassTeacherSection key={group.letter} title={group.letter} count={group.items.length}>
          <ul className="grid grid-cols-1 gap-1.5 tablet:grid-cols-2">
            {group.items.map((teacher) => (
              <TeacherRow
                key={teacher.id}
                teacher={teacher}
                isSelected={teacher.id === selected}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </GlassTeacherSection>
      ))}
    </div>
  );
};

type GlassTeacherSectionProps = {
  title: string;
  count: number;
  children: ReactNode;
};

const GlassTeacherSection = ({ title, count, children }: GlassTeacherSectionProps) => (
  <section className="flex flex-col gap-2">
    <div className="flex items-center justify-between px-1">
      <h2 className="u-eyebrow">{title}</h2>
      <span className="u-data text-micro text-muted">{count}</span>
    </div>

    <div className="u-schedule-glass rounded-xl p-2">{children}</div>
  </section>
);
