import { Icon } from "@/ds";
import { useT } from "@/ui/i18n";
import type { ClassOption } from "@/ui/hooks/useClasses.ts";
import { Section } from "./settings-section.tsx";

type ClassSectionProps = {
  selectedClass: ClassOption | null;
  onPickClass: () => void;
};

export const ClassSection = ({ selectedClass, onPickClass }: ClassSectionProps) => {
  const t = useT();

  return (
    <Section title={t("settings.class")}>
      <button
        type="button"
        onClick={onPickClass}
        className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 py-3.5 text-left"
      >
        <span className="font-text text-body font-bold text-strong">
          {selectedClass?.short ?? t("day.noClass")}
        </span>
        <span className="inline-flex items-center gap-1 font-text text-caption font-bold text-link">
          {t("settings.change")}
          <Icon name="chevron-right" size={16} />
        </span>
      </button>
    </Section>
  );
};
