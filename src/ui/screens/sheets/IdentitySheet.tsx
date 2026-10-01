import { BottomSheet, SegmentedTabs, Button, Icon } from "@/ds";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { PERSONAS, isIdentified, matchPersona, type Persona } from "@/lib/persona";
import { PERSONA_PROFILES, useIdentity, useIdentityLabel } from "@/ui/persona";

type IdentitySheetProps = {
  open: boolean;
  onClose: () => void;
  onPickClass: () => void;
  onPickTeacher: () => void;
};

export const IdentitySheet = ({
  open,
  onClose,
  onPickClass,
  onPickTeacher,
}: IdentitySheetProps) => {
  const t = useT();
  const identity = useIdentity();
  const { persona } = identity;
  const profile = PERSONA_PROFILES[persona];
  const setPersona = useAppStore((s) => s.setPersona);
  const identityLabel = useIdentityLabel();

  const handlePersonaChange = (newPersona: Persona) => {
    void setPersona(newPersona);
  };

  const pickIdentity = matchPersona(identity, {
    student: () => onPickClass,
    teacher: () => onPickTeacher,
  });

  const handleConfirm = () => {
    void setPersona(persona);
    onClose();
    if (!isIdentified(identity)) pickIdentity();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("settings.identity.sheetTitle")}>
      <div className="flex flex-col gap-6 p-4">
        <SegmentedTabs<Persona>
          items={PERSONAS.map((key) => ({ key, label: t(PERSONA_PROFILES[key].roleLabel) }))}
          value={persona}
          onChange={handlePersonaChange}
        />

        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-hairline bg-card p-4">
            <span className="font-text text-caption text-muted">{t(profile.subjectLabel)}</span>
            <p className="mt-1 font-text text-body font-bold text-strong">
              {identityLabel ?? t(profile.noneSelected)}
            </p>
          </div>
          <Button
            variant="outline"
            block
            onClick={() => {
              onClose();
              pickIdentity();
            }}
          >
            <Icon name="repeat" size={16} />
            {t("settings.change")}
          </Button>
        </div>

        <Button variant="primary" block onClick={handleConfirm}>
          {t("settings.identity.confirm")}
        </Button>
      </div>
    </BottomSheet>
  );
};
