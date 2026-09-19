import { Icon } from "@/ds";
import { useT } from "@/ui/i18n";

type OnboardingPersonaProps = {
  onSelectPersona: (persona: "student" | "teacher") => void;
};

export const OnboardingPersona = ({ onSelectPersona }: OnboardingPersonaProps) => {
  const t = useT();

  return (
    <div className="flex min-h-0 flex-1 flex-col px-gutter pb-6">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 text-center">
        <div>
          <h1 className="font-display text-title tracking-display text-strong">
            {t("onboarding.persona.title")}
          </h1>
          <p className="mt-2 font-text text-body text-muted">
            {t("onboarding.persona.subtitle")}
          </p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-4">
          <button
            type="button"
            onClick={() => onSelectPersona("student")}
            className="group relative flex w-full cursor-pointer flex-col rounded-2xl border-2 border-hairline bg-card p-5 text-left transition-all hover:border-brand-strong hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand-strong transition-colors group-hover:bg-brand/20">
                <Icon name="graduation-cap" size={24} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-display text-heading font-bold text-strong">
                  {t("onboarding.persona.student.title")}
                </span>
                <span className="mt-0.5 font-text text-caption text-muted">
                  {t("onboarding.persona.student.desc")}
                </span>
              </div>
              <Icon name="chevron-right" size={18} className="text-muted group-hover:text-strong" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectPersona("teacher")}
            className="group relative flex w-full cursor-pointer flex-col rounded-2xl border-2 border-hairline bg-card p-5 text-left transition-all hover:border-brand-strong hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-colors group-hover:bg-amber-500/20">
                <Icon name="briefcase" size={24} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-display text-heading font-bold text-strong">
                  {t("onboarding.persona.teacher.title")}
                </span>
                <span className="mt-0.5 font-text text-caption text-muted">
                  {t("onboarding.persona.teacher.desc")}
                </span>
              </div>
              <Icon name="chevron-right" size={18} className="text-muted group-hover:text-strong" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
