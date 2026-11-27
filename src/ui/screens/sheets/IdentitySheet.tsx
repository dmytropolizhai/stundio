import { BottomSheet, SegmentedTabs, Button, Icon } from "@/ds";
import { useSettingSetter } from "@/store";
import { useT } from "@/ui/i18n";
import { PERSONAS, isIdentified, matchPersona, type Persona } from "@/lib/persona";
import { PERSONA_PROFILES, useIdentity, useIdentityLabel } from "@/ui/persona";
import { SheetDescription, SheetTitle } from "../settings-view";

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
  const setPersona = useSettingSetter("persona");
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
    <BottomSheet
      open={open}
      onClose={onClose}
      title={<SheetTitle icon={profile.icon}>{t("settings.identity.sheetTitle")}</SheetTitle>}
    >
      <SheetDescription>{t("settings.identityHint")}</SheetDescription>
      <div className="flex flex-col gap-6 p-4 pt-0">
        <SegmentedTabs<Persona>
          items={PERSONAS.map((key) => ({ key, label: t(PERSONA_PROFILES[key].roleLabel) }))}
          value={persona}
          onChange={handlePersonaChange}
        />

        <div className="flex flex-col gap-3">
          <div
            data-testid="identity-current-card"
            className="u-schedule-glass-live overflow-hidden rounded-xl p-4"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(85% 110% at 100% 0%, color-mix(in oklab, var(--lamp) 26%, transparent) 0%, transparent 70%)",
              }}
            />
            <span className="relative z-1 font-text text-caption text-muted">
              {t(profile.subjectLabel)}
            </span>
            <p className="relative z-1 mt-1 font-text text-body font-bold text-strong">
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
