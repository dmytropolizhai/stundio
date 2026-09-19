import { useT } from "@/ui/i18n";
import type { Slide } from "./slides.ts";

type IntroPaginationProps = {
  slides: Slide[];
  step: number;
};

export const IntroPagination = ({ slides, step }: IntroPaginationProps) => {
  const t = useT();

  return (
    <div
      className="flex items-center justify-center gap-2 pb-6"
      role="tablist"
      aria-label={t("onboarding.intro.progress")}
    >
      {slides.map((s, i) => (
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
  );
};
