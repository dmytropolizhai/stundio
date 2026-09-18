import { Switch } from "@/ds";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { Row, Section } from "./settings-section.tsx";

export const ScheduleSection = () => {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const setMergeConsecutiveLessons = useAppStore((s) => s.setMergeConsecutiveLessons);
  const setShowTime = useAppStore((s) => s.setShowTime);

  return (
    <>
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
            checked={settings.mergeConsecutiveLessons}
            onChange={(checked) => {
              void setMergeConsecutiveLessons(checked);
            }}
          />
        </Row>
      </Section>

      <Section title={t("settings.day")}>
        <Row className="flex items-start justify-between gap-3">
          <div>
            <p className="font-text text-body font-bold text-strong">{t("settings.showTime")}</p>
            <p className="mt-0.5 font-text text-caption text-muted">{t("settings.showTimeHint")}</p>
          </div>
          <Switch
            aria-label={t("settings.showTime")}
            checked={settings.showTime}
            onChange={(checked) => {
              void setShowTime(checked);
            }}
          />
        </Row>
      </Section>
    </>
  );
};
