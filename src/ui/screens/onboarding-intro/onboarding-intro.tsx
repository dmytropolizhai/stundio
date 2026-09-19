import { useRef, useState, type TouchEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/ds";
import { ensureNotificationPermission } from "@/notifications";
import { useT } from "@/ui/i18n";
import { SLIDES } from "./slides.ts";
import { IntroPagination } from "./intro-pagination.tsx";
import { IntroSlide } from "./intro-slide.tsx";

const SWIPE_THRESHOLD_PX = 56;

type OnboardingIntroProps = {
  onDone: () => void;
};

/**
 * Three feature slides shown before the class picker on first launch — what the app does,
 * before asking the one question it needs answered. Skippable at every step: this is a
 * courtesy tour, not a gate.
 */
export const OnboardingIntro = ({ onDone }: OnboardingIntroProps) => {
  const t = useT();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  /*
   * Swipeable, same mechanics as DayView's day paging: `dragX` tracks the finger live, `enterDir`
   * remembers which way we just paged so the next slide's content arrives from the side it
   * logically came from. Swiping past the last slide finishes the tour, same as tapping the button.
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
      void ensureNotificationPermission();
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
    <div className="flex min-h-0 flex-1 flex-col px-gutter pb-6">
      <div className="flex justify-end pt-4">
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t("onboarding.intro.skip")}
        </Button>
      </div>

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

      <IntroPagination slides={SLIDES} step={step} />

      <Button block size="lg" onClick={advance}>
        {isLast ? t("onboarding.intro.start") : t("onboarding.intro.next")}
      </Button>
    </div>
  );
};
