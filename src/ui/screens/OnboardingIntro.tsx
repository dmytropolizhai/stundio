import { useRef, useState, type ComponentType, type TouchEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/ds";
import { ensureNotificationPermission } from "@/notifications";
import {
  AppScreensArt,
  ChangesArt,
  NotificationArt,
  OfflineArt,
} from "../components/OnboardingArt.tsx";
import { useT } from "@/ui/i18n";
import type { MessageKey } from "@/ui/i18n";

const SWIPE_THRESHOLD_PX = 56;

/**
 * Each slide leads with a working piece of the app rather than an icon standing in for one —
 * `art` is the component that demonstrates the promise the copy makes. See `OnboardingArt.tsx`.
 */
type Slide = {
  art: ComponentType;
  title: MessageKey;
  body: MessageKey;
};

const SLIDES: Slide[] = [
  {
    art: AppScreensArt,
    title: "onboarding.intro.step1.title",
    body: "onboarding.intro.step1.body",
  },
  {
    art: ChangesArt,
    title: "onboarding.intro.step2.title",
    body: "onboarding.intro.step2.body",
  },
  {
    art: OfflineArt,
    title: "onboarding.intro.step3.title",
    body: "onboarding.intro.step3.body",
  },
  {
    art: NotificationArt,
    title: "onboarding.intro.step4.title",
    body: "onboarding.intro.step4.body",
  },
];

/**
 * Three feature slides shown before the class picker on first launch — what the app does,
 * before asking the one question it needs answered. Skippable at every step: this is a
 * courtesy tour, not a gate.
 */
export const OnboardingIntro = ({
  onDone,
  onSkip,
}: {
  onDone: () => void;
  onSkip?: () => void;
}) => {
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
  const Art = slide.art;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-gutter pb-6">
      <div className="flex justify-end pt-4">
        <Button variant="ghost" size="sm" onClick={onSkip ?? onDone}>
          {t("onboarding.intro.skip")}
        </Button>
      </div>

      <motion.div
        key={step}
        role="group"
        tabIndex={0}
        aria-label={t("onboarding.intro.progress")}
        initial={{ opacity: 0, x: reduceMotion ? 0 : enterDir.current * 16 }}
        animate={{ opacity: 1, x: dragging ? dragX : 0 }}
        transition={{
          duration: dragging ? 0 : reduceMotion ? 0.001 : 0.24,
          ease: [0.2, 0.8, 0.2, 1],
        }}
        style={{ touchAction: "pan-y" }}
        onTouchStart={onSwipeStart}
        onTouchMove={onSwipeMove}
        onTouchEnd={onSwipeEnd}
        onTouchCancel={onSwipeEnd}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") advance();
          else if (e.key === "ArrowLeft") goBack();
        }}
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Art />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-title tracking-display text-strong">{t(slide.title)}</h1>
          <p className="max-w-70 font-text text-body text-muted">{t(slide.body)}</p>
        </div>
      </motion.div>

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
