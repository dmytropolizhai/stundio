import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";
import { Row, Section } from "./settings-section.tsx";

/** Commute origin stays in local settings so the Transit screen can plan from it automatically. */
export const CommuteSection = () => {
  const t = useT();
  const home = useAppStore((s) => s.settings.commuteHome);
  const setHome = useAppStore((s) => s.setCommuteHome);

  return (
    <Section title={t("settings.commute")}>
      <Row>
        <label className="block font-text text-body-sm font-semibold text-strong">
          {t("settings.commute.home")}
          <input
            autoComplete="street-address"
            value={home}
            onChange={(event) => void setHome(event.target.value)}
            placeholder={t("settings.commute.homePlaceholder")}
            className="mt-2 min-h-12 w-full rounded-xl border border-hairline bg-app px-3 font-text text-body-sm font-normal text-strong outline-none focus:border-brand"
          />
        </label>
        <p className="mt-2 font-text text-caption text-muted">{t("settings.commute.homeHint")}</p>
      </Row>
    </Section>
  );
};
