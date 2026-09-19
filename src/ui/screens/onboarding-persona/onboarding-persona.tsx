import { Icon } from "@/ds";
import { useT } from "@/ui/i18n";

type OnboardingPersonaProps = {
  onSelectPersona: (persona: "student" | "teacher") => void;
};

export const OnboardingPersona = ({ onSelectPersona }: OnboardingPersonaProps) => {
  const t = useT();

  return (
    <div className="relative flex h-full w-full min-h-0 flex-1 select-none overflow-hidden bg-[#0b0c10] font-text">
      {/* Top Header overlay spanning both sides */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center px-4 pt-[calc(var(--spacing(8))+var(--app-inset-top))] text-center">
        <h1 className="font-display text-xl font-black tracking-[-0.025em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-3xl">
          {t("onboarding.persona.title")}
        </h1>
        <p className="mt-1 hidden max-w-xs text-xs font-medium text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] sm:block">
          {t("onboarding.persona.subtitle")}
        </p>
      </div>

      {/* Central Seam line */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/35 to-transparent" />

      {/* Central "CHOOSE YOUR SIDE" badge */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-[#0b0c10]/90 px-3.5 py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-md sm:px-4 sm:py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1e3aff] shadow-[0_0_8px_#1e3aff]" />
          <span className="font-mono text-[9px] font-extrabold tracking-[0.2em] text-white/95 uppercase sm:text-[11px]">
            CHOOSE YOUR SIDE
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#ffb552] shadow-[0_0_8px_#ffb552]" />
        </div>
      </div>

      {/* LEFT HALF: STUDENT (Stundio Electric Blue) */}
      <button
        type="button"
        onClick={() => onSelectPersona("student")}
        aria-label={`${t("onboarding.persona.student.title")} - ${t("onboarding.persona.student.desc")}`}
        className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-between overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#1e3aff] via-[#1730d6] to-[#0e21a8] px-3 pb-[calc(var(--spacing(8))+var(--app-inset-bottom))] pt-[calc(var(--spacing(20))+var(--app-inset-top))] text-center text-white transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:flex-[1.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e3aff] dark:from-[#112399] dark:via-[#0c1970] dark:to-[#060b3d]"
      >
        {/* Soft electric blue ambient highlight */}
        <div className="pointer-events-none absolute -left-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-white/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 text-white/[0.07]">
          <Icon name="graduation-cap" size={200} />
        </div>

        {/* Top spacer to balance layout with header */}
        <div className="h-6 w-full" />

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center px-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.25),0_0_24px_rgba(255,255,255,0.2)] backdrop-blur-xs transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20 sm:rounded-3xl">
            <Icon name="graduation-cap" size={36} />
          </div>

          <h2 className="mt-5 font-display text-xl font-bold tracking-[-0.025em] text-white sm:text-3xl">
            {t("onboarding.persona.student.title")}
          </h2>

          <p className="mt-2 line-clamp-3 max-w-[150px] font-text text-[11px] leading-relaxed text-white/80 sm:max-w-[200px] sm:text-xs">
            {t("onboarding.persona.student.desc")}
          </p>
        </div>

        {/* Bottom CTA pill: Stundio white pill on electric blue */}
        <div className="relative z-10 flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-xs font-semibold tracking-wide text-[#1730d6] shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition-all duration-200 group-hover:bg-white/95 group-hover:shadow-lg active:scale-[0.97] sm:px-6 sm:py-3">
          <span>{t("share.language.continue")}</span>
          <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>

      {/* RIGHT HALF: TEACHER (Stundio Obsidian & Amber) */}
      <button
        type="button"
        onClick={() => onSelectPersona("teacher")}
        aria-label={`${t("onboarding.persona.teacher.title")} - ${t("onboarding.persona.teacher.desc")}`}
        className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#0e0f14] via-[#090a0e] to-[#040406] px-3 pb-[calc(var(--spacing(8))+var(--app-inset-bottom))] pt-[calc(var(--spacing(20))+var(--app-inset-top))] text-center text-white transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:flex-[1.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb552] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c10]"
      >
        {/* Amber edge beam & ambient glow */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-2.5 bg-gradient-to-l from-[#ffb552]/40 via-amber-600/20 to-transparent blur-sm sm:w-4" />
        <div className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 text-amber-500/[0.05]">
          <Icon name="briefcase" size={200} />
        </div>

        {/* Top spacer to balance layout with header */}
        <div className="h-6 w-full" />

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center px-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ffb552]/30 bg-[#ffb552]/10 text-[#ffb552] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5),0_0_24px_rgba(255,181,82,0.2)] transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20 sm:rounded-3xl">
            <Icon name="briefcase" size={36} />
          </div>

          <h2 className="mt-5 font-display text-xl font-bold tracking-[-0.025em] text-white sm:text-3xl">
            {t("onboarding.persona.teacher.title")}
          </h2>

          <p className="mt-2 line-clamp-3 max-w-[150px] font-text text-[11px] leading-relaxed text-[#b9bfce] sm:max-w-[200px] sm:text-xs">
            {t("onboarding.persona.teacher.desc")}
          </p>
        </div>

        {/* Bottom CTA pill: Stundio amber pill with dark ink */}
        <div className="relative z-10 flex items-center gap-1.5 rounded-full bg-[#ffb552] px-5 py-2.5 text-xs font-semibold tracking-wide text-[#0b0c10] shadow-[0_4px_20px_rgba(255,181,82,0.35)] transition-all duration-200 group-hover:bg-[#ffbe6b] group-hover:shadow-lg active:scale-[0.97] sm:px-6 sm:py-3">
          <span>{t("share.language.continue")}</span>
          <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>
    </div>
  );
};
