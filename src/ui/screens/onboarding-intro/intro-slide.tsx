import type { TouchEvent } from "react";
import { m } from "framer-motion";
import { useAppStore, useSettingSetter } from "@/store";
import { useT, type Lang } from "@/ui/i18n";
import { LanguageList } from "@/ui/screens/onboarding-language";
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
  const lang = useAppStore((s) => s.settings.lang);
  const setLang = useSettingSetter("lang");

  return (
    <m.div
      key={step}
      role="group"
      tabIndex={0}
      aria-label={t("onboarding.intro.progress")}
      initial={{ opacity: 0, x: reduceMotion ? 0 : enterDir * 20 }}
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
      className="flex min-h-0 flex-1 flex-col justify-between gap-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {slide.kind === "language" ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-6 py-4">
          <h1 className="font-display text-display-2 tracking-display text-strong text-balance">
            {t(slide.title)}
          </h1>
          <LanguageList
            label={t(slide.title)}
            selectedLang={lang}
            onSelect={(key: Lang) => {
              void setLang(key);
            }}
          />
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 items-center justify-center py-4">
            <slide.art />
          </div>

          <div className="flex flex-col gap-2 text-left">
            <h1 className="font-display text-display-2 tracking-display text-strong text-balance">
              {t(slide.title)}
            </h1>
            <p className="max-w-[34ch] font-text text-body text-muted">{t(slide.body)}</p>
          </div>
        </>
      )}
    </m.div>
  );
};
