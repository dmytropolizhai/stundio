import type { TouchEvent } from "react";
import { motion } from "framer-motion";
import { useT } from "@/ui/i18n";
import type { Slide } from "./slides.ts";

type IntroSlideProps = {
  slide: Slide;
  step: number;
  reduceMotion: boolean;
  enterDir: 1 | -1;
  dragging: boolean;
  dragX: number;
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
  onAdvance: () => void;
  onGoBack: () => void;
};

export const IntroSlide = ({
  slide,
  step,
  reduceMotion,
  enterDir,
  dragging,
  dragX,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onAdvance,
  onGoBack,
}: IntroSlideProps) => {
  const t = useT();
  const Art = slide.art;

  return (
    <motion.div
      key={step}
      role="group"
      tabIndex={0}
      aria-label={t("onboarding.intro.progress")}
      initial={{ opacity: 0, x: reduceMotion ? 0 : enterDir * 16 }}
      animate={{ opacity: 1, x: dragging ? dragX : 0 }}
      transition={{
        duration: dragging ? 0 : reduceMotion ? 0.001 : 0.24,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      style={{ touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onAdvance();
        else if (e.key === "ArrowLeft") onGoBack();
      }}
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <Art />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-title tracking-display text-strong">{t(slide.title)}</h1>
        <p className="max-w-70 font-text text-body text-muted">{t(slide.body)}</p>
      </div>
    </motion.div>
  );
};
