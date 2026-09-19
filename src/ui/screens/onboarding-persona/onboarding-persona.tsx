import { useT } from "@/ui/i18n";
import { Button } from "@/ds";
import { type ReactNode } from "react";

type Persona = "student" | "teacher";

type OnboardingPersonaProps = {
  onSelectPersona: (persona: Persona) => void;
};

type PersonaPanelProps = {
  persona: Persona;
  onSelect: () => void;
};

const PERSONA_STYLES: Record<
  Persona,
  {
    panel: string;
    focus: string;
    description: string;
    decoration: ReactNode;
  }
> = {
  student: {
    panel:
      "border-r border-white/10 bg-gradient-to-b from-[#1e3aff] via-[#1730d6] to-[#0e21a8] dark:from-[#112399] dark:via-[#0c1970] dark:to-[#060b3d]",
    focus: "focus-visible:ring-white focus-visible:ring-offset-[#1e3aff]",
    description: "text-white/80",
    decoration: (
      <div className="pointer-events-none absolute -left-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-white/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
    ),
  },
  teacher: {
    panel: "bg-gradient-to-b from-[#0e0f14] via-[#090a0e] to-[#040406]",
    focus: "focus-visible:ring-[#ffb552] focus-visible:ring-offset-[#0b0c10]",
    description: "text-[#b9bfce]",
    decoration: (
      <>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-2.5 bg-linear-to-l from-[#ffb552]/40 via-amber-600/20 to-transparent blur-sm sm:w-4" />
        <div className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
      </>
    ),
  },
};

const PersonaPanel = ({ persona, onSelect }: PersonaPanelProps) => {
  const t = useT();
  const styles = PERSONA_STYLES[persona];

  const titleKey = `onboarding.persona.${persona}.title` as const;
  const descriptionKey = `onboarding.persona.${persona}.desc` as const;

  const title = t(titleKey);
  const description = t(descriptionKey);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${title} - ${description}`}
      className={`group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden px-3 pb-[calc(var(--spacing(8))+var(--app-inset-bottom))] pt-[calc(var(--spacing(20))+var(--app-inset-top))] text-center text-white transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:flex-[1.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles.panel} ${styles.focus}`}
    >
      {styles.decoration}

      {/* Top spacer */}
      <div className="h-6 w-full" />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center px-1">
        <h2 className="mt-5 font-display text-xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>

        <p
          className={`mt-2 line-clamp-3 max-w-37.5 font-text text-[11px] leading-relaxed sm:max-w-50 sm:text-xs ${styles.description}`}
        >
          {description}
        </p>

        <Button className="mt-4">{t("general.continue")}</Button>
      </div>
    </button>
  );
};

export const OnboardingPersona = ({ onSelectPersona }: OnboardingPersonaProps) => {
  const t = useT();

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 select-none overflow-hidden bg-[#0b0c10] font-text">
      {/* Header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center px-4 pt-[calc(var(--spacing(16))+var(--app-inset-top))]">
        <h1 className="text-xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-3xl">
          {t("onboarding.persona.title")}
        </h1>

        <p className="mt-1 hidden max-w-xs text-xs font-medium text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] sm:block">
          {t("onboarding.persona.subtitle")}
        </p>
      </div>

      {/* Persona panels */}
      <PersonaPanel persona="student" onSelect={() => onSelectPersona("student")} />

      <PersonaPanel persona="teacher" onSelect={() => onSelectPersona("teacher")} />
    </div>
  );
};
