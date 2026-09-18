import { Switch } from "@/ds";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { Row, Section } from "@/ui/screens/settings-view";

export const DaySettings = () => {
  const t = useT();
  const showTime = useAppStore((s) => s.settings.showTime);
  const setShowTime = useAppStore((s) => s.setShowTime);

  return (
    <div className="mt-7">
      <Section title={t("settings.day")}>
        <Row className="flex items-start justify-between gap-3">
          <div>
            <p className="font-text text-body font-bold text-strong">{t("settings.showTime")}</p>
            <p className="mt-0.5 font-text text-caption text-muted">{t("settings.showTimeHint")}</p>
          </div>
          <Switch
            aria-label={t("settings.showTime")}
            checked={showTime}
            onChange={(checked) => {
              void setShowTime(checked);
            }}
          />
        </Row>
      </Section>
    </div>
  );
};
