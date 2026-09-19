import { Card } from "@/ds";
import type { SubjectRef, TeacherRef } from "@/lib/edupage";
import { useT } from "@/ui/i18n";

type TeacherListProps = {
  teachers: { teacher: TeacherRef; subjects: SubjectRef[] }[];
};

export const TeacherList = ({ teachers }: TeacherListProps) => {
  const t = useT();

  if (teachers.length === 0) return null;

  return (
    <>
      <h2 className="mb-3 font-display text-display-2 tracking-display text-strong">
        {t("subjects.teachers")}
      </h2>
      <Card radius="xl" className="p-0">
        {teachers.map(({ teacher, subjects: taught }, i) => (
          <div
            key={teacher.id}
            className={`flex items-center gap-3 px-4 py-3.5 ${i === 0 ? "" : "border-t border-hairline"}`}
          >
            <span className="inline-flex size-9.5 items-center justify-center rounded-squircle bg-brand-tint font-display text-[16px] font-black text-brand-strong">
              {teacher.short.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-text text-body font-bold text-strong">{teacher.short}</div>
              <div className="truncate font-text text-caption text-muted">
                {taught.map((s) => s.name || s.short).join(" · ")}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
};
