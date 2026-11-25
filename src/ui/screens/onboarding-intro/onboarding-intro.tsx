import { useRef, useState, type TouchEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/ds";
import { ensureNotificationPermission } from "@/notifications";
import { useBackButton } from "@/ui/hooks/useBackButton.ts";
import { useT } from "@/ui/i18n";
import { SLIDES } from "./slides.ts";
import { IntroPagination } from "./intro-pagination.tsx";
import { IntroSlide } from "./intro-slide.tsx";

const SWIPE_THRESHOLD_PX = 56;

type OnboardingIntroProps = {
  onDone: () => void;
};

/**
 * Four live Night / Day feature slides shown before role selection on first launch — proving what
 * Stundio does with real liquid-glass specimens before asking who you are. Skippable at every
 * step: this is a courtesy tour, not a gate.
 */
export const OnboardingIntro = ({ onDone }: OnboardingIntroProps) => {
  const t = useT();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  /*
   * Swipeable, same mechanics as Home's day paging: `dragX` tracks the finger live, `enterDir`
   * remembers which way we just paged so the next slide's content arrives from the side it
   * logically came from. Swiping past the last slide finishes the tour, same as tapping the CTA.
   */
  const reduceMotion = useReducedMotion() ?? false;
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const enterDir = useRef<1 | -1>(1);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const advance = () => {
    if (isLast) {
      // The last slide is the one that explains notifications, so this is the moment the OS
      // permission dialog has context — "Get started" here doubles as "yes, notify me".
      // Skipping the tour (the button above) never requests permission, by design.
      void ensureNotificationPermission().catch(() => undefined);
      onDone();
    } else {
      enterDir.current = 1;
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step === 0) return;
    enterDir.current = -1;
    setStep((s) => s - 1);
  };

  useBackButton(
    () => {
      goBack();
      return true;
    },
    { enabled: step > 0, priority: 12 },
  );

  const jumpTo = (target: number) => {
    if (target === step || target < 0 || target >= SLIDES.length) return;
    enterDir.current = target > step ? 1 : -1;
    setStep(target);
  };

  const onSwipeStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (touch === undefined) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    setDragging(true);
  };

  const onSwipeMove = (e: TouchEvent) => {
    const start = touchStart.current;
    const touch = e.touches[0];
    if (start === null || touch === undefined) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // A steeper vertical drag isn't a page gesture — leave it alone.
    if (Math.abs(dy) > Math.abs(dx)) return;
    setDragX(dx);
  };

  const onSwipeEnd = () => {
    const started = touchStart.current !== null;
    touchStart.current = null;
    setDragging(false);
    if (started) {
      if (dragX <= -SWIPE_THRESHOLD_PX) {
        advance();
      } else if (dragX >= SWIPE_THRESHOLD_PX) {
        goBack();
      }
    }
    setDragX(0);
  };

  if (slide === undefined) return null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-app">
      {/* Soft per-slide ambient caustic glow so the liquid-glass specimens have light to refract. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[58%] transition-[background] duration-(--dur-slow) ease-(--ease-standard)"
        style={{
          background: `radial-gradient(68% 62% at 50% 38%, color-mix(in oklab, ${slide.glow} 22%, transparent) 0%, transparent 74%)`,
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-screen flex-1 flex-col px-gutter pt-[calc(--spacing(4)+var(--app-inset-top))] pb-[calc(--spacing(6)+var(--app-inset-bottom))] tablet:py-10">
        <header className="flex items-center justify-between gap-3">
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

          <Button variant="glass" size="sm" onClick={onDone}>
            {t("onboarding.intro.skip")}
          </Button>
        </header>

        <IntroSlide
          slide={slide}
          step={step}
          reduceMotion={reduceMotion}
          enterDir={enterDir.current}
          dragging={dragging}
          dragX={dragX}
          onTouchStart={onSwipeStart}
          onTouchMove={onSwipeMove}
          onTouchEnd={onSwipeEnd}
          onAdvance={advance}
          onGoBack={goBack}
        />

        <div className="mt-5 flex flex-col gap-4">
          <IntroPagination slides={SLIDES} step={step} onSelect={jumpTo} />

          <div className="flex items-center gap-2.5">
            {step > 0 && (
              <Button
                variant="glass"
                size="lg"
                icon="arrow-left"
                aria-label={t("onboarding.intro.back")}
                onClick={goBack}
                className="shrink-0 px-4"
              />
            )}
            <Button block size="lg" iconEnd="arrow-right" onClick={advance}>
              {slide.kind === "language"
                ? t("onboarding.language.continue")
                : slide.kind === "institution"
                  ? t("general.continue")
                  : isLast
                    ? t("onboarding.intro.start")
                    : t("onboarding.intro.next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
