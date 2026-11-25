import { useAppStore, useSettingSetter } from "@/store";
import { Button } from "@/ds";
import { useT, type Lang } from "@/ui/i18n";
import { LanguageList } from "./language-list.tsx";

type OnboardingLanguageProps = {
  onDone: () => void;
};

/**
 * The very first question on first launch — before the welcome tour, before role selection.
 * Shares the same Night / Day editorial frame and top-left logo anchor as `OnboardingIntro` so
 * advancing feels like one continuous flow. Every label stays in its own language so a
 * non-Latvian speaker can find their language without reading Latvian first.
 */
export const OnboardingLanguage = ({ onDone }: OnboardingLanguageProps) => {
  const t = useT();
  const lang = useAppStore((s) => s.settings.lang);
  const setLang = useSettingSetter("lang");

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-app">
      {/* Subtle ambient glow matching OnboardingIntro so the glass language slab refracts light. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[54%]"
        style={{
          background:
            "radial-gradient(68% 62% at 50% 34%, color-mix(in oklab, var(--lamp) 18%, transparent) 0%, transparent 74%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-screen flex-1 flex-col px-gutter pt-[calc(--spacing(4)+var(--app-inset-top))] pb-[calc(--spacing(6)+var(--app-inset-bottom))] tablet:py-10">
        <header className="flex h-9 items-center">
          <span
            role="img"
            aria-label={t("app.title")}
            className="size-8 shrink-0 bg-strong"
            style={{
              maskImage: "url(/mark.svg)",
              WebkitMaskImage: "url(/mark.svg)",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
          />
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 py-4">
          <h1 className="font-display text-display-2 tracking-display text-strong shrink-0 text-balance">
            {t("onboarding.language.title")}
          </h1>

          <LanguageList
            label={t("onboarding.language.title")}
            selectedLang={lang}
            onSelect={(key: Lang) => {
              void setLang(key);
            }}
          />
        </div>

        <Button block size="lg" iconEnd="arrow-right" onClick={onDone}>
          {t("onboarding.language.continue")}
        </Button>
      </div>
    </div>
  );
};
