import { useAppStore } from "@/store";
import { Button } from "@/ds";
import { useT, type Lang } from "@/ui/i18n";
import { LanguageList } from "./language-list.tsx";

type OnboardingLanguageProps = {
  onDone: () => void;
};

/**
 * The very first question on the first launch — before the feature tour, before the class picker.
 * Every label is written in its own language rather than the current (default `lv`) one, so a
 * non-Latvian speaker can still find their language without reading Latvian first.
 */
export const OnboardingLanguage = ({ onDone }: OnboardingLanguageProps) => {
  const t = useT();
  const lang = useAppStore((s) => s.settings.lang);
  const setLang = useAppStore((s) => s.setLang);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-gutter pb-6">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 text-center">
        <h1 className="font-display text-title tracking-display text-strong">
          {t("onboarding.language.title")}
        </h1>
        <LanguageList
          selectedLang={lang}
          onSelect={(key: Lang) => {
            void setLang(key);
          }}
        />
      </div>

      <Button block size="lg" onClick={onDone}>
        {t("onboarding.language.continue")}
      </Button>
    </div>
  );
};
