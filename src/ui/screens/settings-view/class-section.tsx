import { Icon } from "@/ds/components/ui/icon";
import { useT } from "@/ui/i18n";
import type { ClassOption } from "@/ui/hooks/useClasses.ts";
import type { TeacherOption } from "@/ui/hooks/useTeachers.ts";
import { Section } from "./settings-section.tsx";

type IdentitySectionProps = {
  persona: "student" | "teacher";
  selectedClass: ClassOption | null;
  selectedTeacher: TeacherOption | null;
  onChangeIdentity: () => void;
};

export const IdentitySection = ({
  persona,
  selectedClass,
  selectedTeacher,
  onChangeIdentity,
}: IdentitySectionProps) => {
  const t = useT();

  const roleLabel =
    persona === "teacher"
      ? t("settings.persona.teacher")
      : t("settings.persona.student");

  const nameLabel =
    persona === "teacher"
      ? selectedTeacher?.short || selectedTeacher?.name || t("teacher.none")
      : selectedClass?.short ?? t("day.noClass");

  return (
    <Section title={t("settings.identity")}>
      <button
        type="button"
        onClick={onChangeIdentity}
        className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 py-3.5 text-left"
      >
        <div className="flex items-baseline gap-1.5 font-text text-body font-bold text-strong truncate pr-2">
          <span className="text-muted font-normal text-caption">
            {roleLabel}:
          </span>
          <span>{nameLabel}</span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 font-text text-caption font-bold text-link">
          {t("settings.change")}
          <Icon name="chevron-right" size={16} />
        </span>
      </button>
    </Section>
  );
};

export { IdentitySection as ClassSection };
