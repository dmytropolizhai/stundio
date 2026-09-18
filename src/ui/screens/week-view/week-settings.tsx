import { Switch } from "@/ds";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { Row, Section } from "@/ui/screens/settings-view";

export const WeekSettings = () => {
  const t = useT();
  const mergeConsecutive = useAppStore((s) => s.settings.mergeConsecutiveLessons);
  const setMergeConsecutiveLessons = useAppStore((s) => s.setMergeConsecutiveLessons);

  return (
    <div className="mt-7">
      <Section title={t("settings.week")}>
        <Row className="flex items-start justify-between gap-3">
          <div>
            <p className="font-text text-body font-bold text-strong">
              {t("settings.mergeLessons")}
            </p>
            <p className="mt-0.5 font-text text-caption text-muted">
              {t("settings.mergeLessonsHint")}
            </p>
          </div>
          <Switch
            aria-label={t("settings.mergeLessons")}
            checked={mergeConsecutive}
            onChange={(checked) => {
              void setMergeConsecutiveLessons(checked);
            }}
          />
        </Row>
      </Section>
    </div>
  );
};
