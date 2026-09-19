import { Card, Icon } from "@/ds";
import { useT } from "@/ui/i18n";

type ChangesAbsentTeachersProps = {
  teachers: readonly string[];
};

export const ChangesAbsentTeachers = ({ teachers }: ChangesAbsentTeachersProps) => {
  const t = useT();

  if (teachers.length === 0) return null;

  return (
    <Card
      tone="sunken"
      radius="lg"
      elevation="none"
      className="mt-3 p-3 flex flex-col gap-1 text-left"
      data-testid="absent-teachers"
    >
      <div className="flex items-center gap-1.5 font-text text-caption font-bold text-fg">
        <Icon name="user-round" size={14} className="shrink-0 text-muted" />
        <span>{t("changes.absentTeachers")}</span>
      </div>
      <p className="font-text text-caption text-muted leading-relaxed">
        {teachers.join(", ")}
      </p>
    </Card>
  );
};
