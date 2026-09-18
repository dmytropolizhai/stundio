import { useAppStore } from "@/store";
import { Button, Card } from "@/ds";
import { LANGS, LANG_NAMES, useT, type Lang } from "@/ui/i18n";

/**
 * The very first question on first launch — before the feature tour, before the class picker.
 * Every label is written in its own language rather than the current (default `lv`) one, so a
 * non-Latvian speaker can still find their language without reading Latvian first.
 */
export const OnboardingLanguage = ({ onDone }: { onDone: () => void }) => {
  const t = useT();
  const lang = useAppStore((s) => s.settings.lang);
  const setLang = useAppStore((s) => s.setLang);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-gutter pb-6">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 text-center">
        <h1 className="font-display text-title tracking-display text-strong">
          {t("onboarding.language.title")}
        </h1>
        <ul className="flex w-full max-w-88 flex-col gap-2.5">
          {LANGS.map((key: Lang) => {
            const active = key === lang;
            return (
              <li key={key}>
                <Card
                  tone="surface"
                  radius="lg"
                  onClick={() => {
                    void setLang(key);
                  }}
                  className={`flex items-center justify-center border-2 ${
                    active ? "border-brand-strong" : "border-transparent"
                  }`}
                >
                  <span
                    className={`font-text text-body font-bold ${
                      active ? "text-brand-strong" : "text-strong"
                    }`}
                  >
                    {LANG_NAMES[key]}
                  </span>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>

      <Button block size="lg" onClick={onDone}>
        {t("onboarding.language.continue")}
      </Button>
    </div>
  );
};
