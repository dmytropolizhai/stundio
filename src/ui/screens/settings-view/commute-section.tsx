/** Home address editing stays local until blur; only committed values reach the cache. */
import { useState } from "react";
import { useAppStore, useSettingSetter } from "@/store";
import { useT } from "@/ui/i18n";
import { Row, Section } from "./settings-section.tsx";

export const CommuteSection = () => {
  const t = useT();
  const home = useAppStore((s) => s.settings.commuteHome);
  const [draft, setDraft] = useState<string | null>(null);
  const setHome = useSettingSetter("commuteHome");

  return (
    <Section title={t("settings.commute")}>
      <Row>
        <label className="block font-text text-body-sm font-semibold text-strong">
          {t("settings.commute.home")}
          <input
            autoComplete="street-address"
            value={draft ?? home}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              if (draft !== null && draft.trim() !== home) void setHome(draft.trim());
              setDraft(null);
            }}
            placeholder={t("settings.commute.homePlaceholder")}
            className="mt-2 min-h-12 w-full rounded-xl border border-hairline bg-app px-3 font-text text-body-sm font-normal text-strong outline-none focus:border-brand"
          />
        </label>
        <p className="mt-2 font-text text-caption text-muted">{t("settings.commute.homeHint")}</p>
      </Row>
    </Section>
  );
};
