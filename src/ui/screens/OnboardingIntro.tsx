import { useState } from "react";
import { Button, Card, Icon, type IconName } from "../../ds/index.ts";
import { useT } from "../i18n/index.ts";
import type { MessageKey } from "../i18n/lv.ts";

type Slide = {
  icon: IconName;
  tone: "sky" | "amber" | "mint";
  title: MessageKey;
  body: MessageKey;
};

const SLIDES: Slide[] = [
  {
    icon: "calendar-days",
    tone: "sky",
    title: "onboarding.intro.step1.title",
    body: "onboarding.intro.step1.body",
  },
  {
    icon: "triangle-alert",
    tone: "amber",
    title: "onboarding.intro.step2.title",
    body: "onboarding.intro.step2.body",
  },
  {
    icon: "wifi-off",
    tone: "mint",
    title: "onboarding.intro.step3.title",
    body: "onboarding.intro.step3.body",
  },
];

/**
 * Three feature slides shown before the class picker on first launch — what the app does,
 * before asking the one question it needs answered. Skippable at every step: this is a
 * courtesy tour, not a gate.
 */
export const OnboardingIntro = ({ onDone }: { onDone: () => void }) => {
  const t = useT();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  const advance = () => {
    if (isLast) {
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  };

  if (slide === undefined) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-gutter pb-6">
      <div className="flex justify-end pt-4">
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t("onboarding.intro.skip")}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 text-center">
        <Card
          tone={slide.tone}
          radius="2xl"
          className="flex size-24 items-center justify-center p-0"
        >
          <Icon name={slide.icon} size={40} />
        </Card>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-title tracking-display text-strong">
            {t(slide.title)}
          </h1>
          <p className="max-w-70 font-text text-body text-muted">{t(slide.body)}</p>
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-2 pb-6"
        role="tablist"
        aria-label={t("onboarding.intro.progress")}
      >
        {SLIDES.map((s, i) => (
          <span
            key={s.title}
            role="tab"
            aria-selected={i === step}
            className={`h-2 rounded-pill transition-[width] duration-(--dur-fast) ${
              i === step ? "w-6 bg-strong" : "w-2 bg-strong-border"
            }`}
          />
        ))}
      </div>

      <Button block size="lg" onClick={advance}>
        {isLast ? t("onboarding.intro.start") : t("onboarding.intro.next")}
      </Button>
    </div>
  );
};
