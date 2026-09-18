import { Icon } from "@/ds";
import { useT } from "@/ui/i18n";
import { Section } from "./settings-section.tsx";

type CustomizationSectionProps = {
  onOpenCustomization: () => void;
};

export const CustomizationSection = ({ onOpenCustomization }: CustomizationSectionProps) => {
  const t = useT();

  return (
    <Section title={t("settings.customization")}>
      <button
        type="button"
        onClick={onOpenCustomization}
        className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 py-3.5 text-left"
      >
        <span className="font-text text-body font-bold text-strong">
          {t("settings.customizationOpen")}
        </span>
        <Icon name="chevron-right" size={16} className="text-muted" />
      </button>
    </Section>
  );
};
