import { useT } from "@/ui/i18n";
import { Button } from "@/ds";
import { type ReactNode } from "react";
import { PersonaTimetableArt } from "./persona-timetable-art.tsx";

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
      "border-r border-white/10 bg-gradient-to-b from-[var(--blue-500)] via-[var(--blue-600)] to-[var(--blue-700)] dark:from-[var(--blue-700)] dark:via-[var(--blue-800)] dark:to-[var(--blue-900)]",
    focus: "focus-visible:inset-ring-white",
    description: "text-white/80",
    decoration: (
      <div className="pointer-events-none absolute -left-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-white/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
    ),
  },
  teacher: {
    panel: "bg-gradient-to-b from-[#0e0f14] via-[var(--ink-900)] to-black",
    focus: "focus-visible:inset-ring-[var(--accent-amber)]",
    description: "text-[var(--ink-300)]",
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
    /*
     * The half is a plain container with one control laid over it, rather than one giant
     * <button>: the miniature inside mounts the real `WeekGrid`, whose cells are buttons, and a
     * button may not contain another. The overlay takes the whole half as its hit target, carries
     * the accessible name, and is the single tab stop; the grid is `inert`, so nothing inside it
     * can take a tap or the focus away from the choice.
     */
    <div
      className={`group relative flex h-full flex-1 flex-col items-center justify-center overflow-hidden px-3 pb-[calc(var(--spacing(8))+var(--app-inset-bottom))] pt-[calc(var(--spacing(20))+var(--app-inset-top))] text-center text-white transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:flex-[1.12] ${styles.panel}`}
    >
      {styles.decoration}

      {/* Center content — the app's own week, then the words that name whose week it is. */}
      <div className="relative z-10 flex w-full flex-col items-center px-1">
        <PersonaTimetableArt persona={persona} />

        <h2 className="mt-6 font-display text-title tracking-display text-white sm:text-display-2">
          {title}
        </h2>

        <p
          className={`mt-2 line-clamp-3 max-w-37.5 font-text text-micro leading-relaxed font-medium sm:max-w-50 sm:text-caption ${styles.description}`}
        >
          {description}
        </p>

        {/* The overlay below is the control; this is its face, pressing with it. */}
        <Button asChild className="mt-4 group-active:scale-(--press-scale)">
          <span>{t("general.continue")}</span>
        </Button>
      </div>

      <button
        type="button"
        onClick={onSelect}
        aria-label={`${title} - ${description}`}
        className={`absolute inset-0 z-20 cursor-pointer focus:outline-none focus-visible:inset-ring-2 ${styles.focus}`}
      />
    </div>
  );
};

export const OnboardingPersona = ({ onSelectPersona }: OnboardingPersonaProps) => {
  const t = useT();

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 select-none overflow-hidden bg-[#0b0c10] font-text">
      {/* Header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center px-4 pt-[calc(var(--spacing(16))+var(--app-inset-top))]">
        <h1 className="font-display text-title tracking-display drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-display-2">
          {t("onboarding.persona.title")}
        </h1>

        <p className="mt-1 hidden max-w-xs text-caption font-medium text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] sm:block">
          {t("onboarding.persona.subtitle")}
        </p>
      </div>

      {/* Persona panels */}
      <PersonaPanel persona="student" onSelect={() => onSelectPersona("student")} />

      <PersonaPanel persona="teacher" onSelect={() => onSelectPersona("teacher")} />
    </div>
  );
};
