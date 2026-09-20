import { BottomSheet, SegmentedTabs, Button, Icon } from "@/ds";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { useSelectedClass } from "@/ui/hooks/useClasses.ts";
import { useSelectedTeacher } from "@/ui/hooks/useTeachers.ts";

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
  const persona = useAppStore((s) => s.settings.persona);
  const setPersona = useAppStore((s) => s.setPersona);
  const selectedClass = useSelectedClass();
  const selectedTeacher = useSelectedTeacher();

  const handlePersonaChange = (newPersona: "student" | "teacher") => {
    void setPersona(newPersona);
  };

  const handleConfirm = () => {
    void setPersona(persona);
    onClose();
    if (persona === "teacher" && !selectedTeacher) {
      onPickTeacher();
    } else if (persona === "student" && !selectedClass) {
      onPickClass();
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("settings.identity.sheetTitle")}>
      <div className="flex flex-col gap-6 p-4">
        <SegmentedTabs<"student" | "teacher">
          items={[
            { key: "student", label: t("settings.persona.student") },
            { key: "teacher", label: t("settings.persona.teacher") },
          ]}
          value={persona}
          onChange={handlePersonaChange}
        />

        {persona === "student" ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-hairline bg-card p-4">
              <span className="font-text text-caption text-muted">{t("settings.class")}</span>
              <p className="mt-1 font-text text-body font-bold text-strong">
                {selectedClass?.short ?? t("day.noClass")}
              </p>
            </div>
            <Button
              variant="outline"
              block
              onClick={() => {
                onClose();
                onPickClass();
              }}
            >
              <Icon name="repeat" size={16} />
              {t("settings.change")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-hairline bg-card p-4">
              <span className="font-text text-caption text-muted">
                {t("onboarding.teacher.title")}
              </span>
              <p className="mt-1 font-text text-body font-bold text-strong">
                {selectedTeacher?.short || selectedTeacher?.name || t("teacher.none")}
              </p>
            </div>
            <Button
              variant="outline"
              block
              onClick={() => {
                onClose();
                onPickTeacher();
              }}
            >
              <Icon name="repeat" size={16} />
              {t("settings.change")}
            </Button>
          </div>
        )}

        <Button variant="primary" block onClick={handleConfirm}>
          {t("settings.identity.confirm")}
        </Button>
      </div>
    </BottomSheet>
  );
};
