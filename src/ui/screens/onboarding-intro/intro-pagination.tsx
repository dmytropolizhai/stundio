import { useT } from "@/ui/i18n";
import type { Slide } from "./slides.ts";

type IntroPaginationProps = {
  slides: Slide[];
  step: number;
  onSelect: (index: number) => void;
};

/**
 * Interactive pill progress strip for the welcome tour. Each step has a comfortable touch area
 * while keeping the visual pills compact and crisp.
 */
export const IntroPagination = ({ slides, step, onSelect }: IntroPaginationProps) => {
  const t = useT();

  return (
    <div
      className="flex items-center gap-1"
      role="tablist"
      aria-label={t("onboarding.intro.progress")}
    >
      {slides.map((s, i) => {
        const active = i === step;
        return (
          <button
            key={s.title}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${t("onboarding.intro.progress")} ${String(i + 1)} / ${String(slides.length)}`}
            onClick={() => {
              onSelect(i);
            }}
            className="flex cursor-pointer items-center justify-center rounded-pill px-1 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span
              className={`h-1.5 rounded-pill transition-[width,background-color] duration-(--dur-base) ease-(--ease-standard) ${
                active ? "w-7 bg-strong" : "w-1.5 bg-strong-border/65"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
