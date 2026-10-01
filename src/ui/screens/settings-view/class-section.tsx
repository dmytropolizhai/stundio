import { Icon } from "@/ds/components/ui/icon";
import type { Persona } from "@/lib/persona";
import { useT } from "@/ui/i18n";
import { PERSONA_PROFILES } from "@/ui/persona";
import { Section } from "./settings-section.tsx";

type IdentitySectionProps = {
  persona: Persona;
  /** The class / teacher label (`useIdentityLabel`); `undefined` while none is picked. */
  label: string | undefined;
  onChangeIdentity: () => void;
};

export const IdentitySection = ({ persona, label, onChangeIdentity }: IdentitySectionProps) => {
  const t = useT();

  const profile = PERSONA_PROFILES[persona];
  const roleLabel = t(profile.roleLabel);
  const nameLabel = label ?? t(profile.noneSelected);

  return (
    <Section title={t("settings.identity")}>
      <button
        type="button"
        onClick={onChangeIdentity}
        className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 py-3.5 text-left"
      >
        <div className="flex items-baseline gap-1.5 font-text text-body font-bold text-strong truncate pr-2">
          <span className="text-muted font-normal text-caption">{roleLabel}:</span>
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
