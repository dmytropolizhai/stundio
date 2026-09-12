import { useRef, useState, type TouchEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button, Card, Icon, type IconName } from "../../ds/index.ts";
import { ensureNotificationPermission } from "../../notifications/index.ts";
import { useT } from "../i18n/index.ts";
import type { MessageKey } from "../i18n/lv.ts";

const SWIPE_THRESHOLD_PX = 56;

type Slide = {
  icon: IconName;
  tone: "sky" | "amber" | "mint" | "lilac";
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
  {
    icon: "bell",
    tone: "lilac",
    title: "onboarding.intro.step4.title",
    body: "onboarding.intro.step4.body",
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
        <Card
          tone={slide.tone}
          radius="2xl"
          className="flex size-24 items-center justify-center p-0"
        >
          <Icon name={slide.icon} size={40} />
        </Card>
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
