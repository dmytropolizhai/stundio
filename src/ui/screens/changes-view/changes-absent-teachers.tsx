import { useState } from "react";
import { Card, Icon } from "@/ds";
import { useT } from "@/ui/i18n";

type ChangesAbsentTeachersProps = {
  teachers: readonly string[];
};

export const ChangesAbsentTeachers = ({ teachers }: ChangesAbsentTeachersProps) => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);

  if (teachers.length === 0) return null;

  const text = teachers.join(", ");
  const isLong = text.length > 150;

  return (
    <Card
      tone="sunken"
      radius="lg"
      elevation="none"
      className="mt-3 p-3 flex flex-col gap-1 text-left"
      data-testid="absent-teachers"
    >
      {isLong ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-2 text-left cursor-pointer select-none"
        >
          <div className="flex items-center gap-1.5 font-text text-caption font-bold text-fg">
            <Icon name="user-round" size={14} className="shrink-0 text-muted" />
            <span>{t("changes.absentTeachers")}</span>
            <span className="font-normal text-muted">({teachers.length})</span>
          </div>
          <Icon
            name="chevron-down"
            size={14}
            className={`shrink-0 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 font-text text-caption font-bold text-fg">
          <Icon name="user-round" size={14} className="shrink-0 text-muted" />
          <span>{t("changes.absentTeachers")}</span>
        </div>
      )}

      {(!isLong || isOpen) && (
        <p className="font-text text-caption text-muted leading-relaxed">{text}</p>
      )}
    </Card>
  );
};

