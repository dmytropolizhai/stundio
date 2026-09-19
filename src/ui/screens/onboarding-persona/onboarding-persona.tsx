import { Icon } from "@/ds";
import { useT } from "@/ui/i18n";

type OnboardingPersonaProps = {
  onSelectPersona: (persona: "student" | "teacher") => void;
};

export const OnboardingPersona = ({ onSelectPersona }: OnboardingPersonaProps) => {
  const t = useT();

  return (
    <div className="relative flex h-full w-full min-h-0 flex-1 select-none overflow-hidden bg-black font-text">
      {/* Top Header spanning both sides */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center px-4 pt-[calc(var(--spacing(8))+var(--app-inset-top))] text-center">
        <h1 className="font-display text-lg font-black tracking-[0.18em] uppercase text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)] sm:text-2xl sm:tracking-[0.22em]">
          {t("onboarding.persona.title")}
        </h1>
        <p className="mt-1 hidden max-w-xs text-xs font-medium text-white/80 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] sm:block">
          {t("onboarding.persona.subtitle")}
        </p>
      </div>

      {/* Central Seam line */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/30 to-transparent" />

      {/* Central "CHOOSE YOUR SIDE" badge */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/85 px-3.5 py-1.5 shadow-[0_0_28px_rgba(0,0,0,0.8)] backdrop-blur-md sm:px-4 sm:py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
          <span className="font-mono text-[9px] font-black tracking-[0.25em] text-white/95 uppercase sm:text-[11px]">
            CHOOSE YOUR SIDE
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
        </div>
      </div>

      {/* LEFT HALF: STUDENT (Light Side) */}
      <button
        type="button"
        onClick={() => onSelectPersona("student")}
        aria-label={`${t("onboarding.persona.student.title")} - ${t("onboarding.persona.student.desc")}`}
        className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-between overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#f7f5ef] via-[#ede7db] to-[#ded6c5] px-3 pb-[calc(var(--spacing(8))+var(--app-inset-bottom))] pt-[calc(var(--spacing(20))+var(--app-inset-top))] text-center text-[#1c1917] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:flex-[1.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:from-[#111827] dark:via-[#152033] dark:to-[#0f172a] dark:text-slate-100"
      >
        {/* Soft cyan/sky ambient highlights */}
        <div className="pointer-events-none absolute -left-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-sky-400/15 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 text-black/[0.03] dark:text-white/[0.03]">
          <Icon name="graduation-cap" size={200} />
        </div>

        {/* Top spacer to balance layout */}
        <div className="h-6 w-full" />

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center px-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-black/5 bg-white/95 text-slate-800 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_0_20px_rgba(56,189,248,0.2)] transition-transform duration-300 group-hover:scale-110 dark:border-white/10 dark:bg-slate-900/90 dark:text-sky-300 dark:shadow-[0_0_25px_rgba(56,189,248,0.2)] sm:h-20 sm:w-20 sm:rounded-3xl">
            <Icon name="graduation-cap" size={36} />
          </div>

          <h2 className="mt-5 font-display text-xl font-bold tracking-tight text-[#1c1917] dark:text-white sm:text-3xl">
            {t("onboarding.persona.student.title")}
          </h2>

          <p className="mt-2 line-clamp-3 max-w-[150px] font-text text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 sm:max-w-[200px] sm:text-xs">
            {t("onboarding.persona.student.desc")}
          </p>
        </div>

        {/* Bottom CTA pill */}
        <div className="relative z-10 flex items-center gap-1.5 rounded-full border border-black/15 bg-black/90 px-4 py-2 text-[10px] font-semibold tracking-wider text-white uppercase shadow-md transition-all duration-200 group-hover:bg-black group-hover:shadow-lg active:scale-95 dark:border-white/20 dark:bg-white/20 dark:text-white sm:px-5 sm:py-2.5 sm:text-xs">
          <span>{t("share.language.continue")}</span>
          <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>

      {/* RIGHT HALF: TEACHER (Dark / Kylo Ren Side) */}
      <button
        type="button"
        onClick={() => onSelectPersona("teacher")}
        aria-label={`${t("onboarding.persona.teacher.title")} - ${t("onboarding.persona.teacher.desc")}`}
        className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#09090b] via-[#121217] to-[#040405] px-3 pb-[calc(var(--spacing(8))+var(--app-inset-bottom))] pt-[calc(var(--spacing(20))+var(--app-inset-top))] text-center text-white transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:flex-[1.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {/* Lightsaber beam along the right edge */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-2.5 bg-gradient-to-l from-amber-500/50 via-rose-600/30 to-transparent blur-sm sm:w-4" />
        <div className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-500/15 via-red-500/10 to-transparent blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 text-white/[0.03]">
          <Icon name="briefcase" size={200} />
        </div>

        {/* Top spacer to balance layout */}
        <div className="h-6 w-full" />

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center px-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-zinc-900/95 text-amber-400 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5),0_0_25px_rgba(245,158,11,0.25)] transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20 sm:rounded-3xl">
            <Icon name="briefcase" size={36} />
          </div>

          <h2 className="mt-5 font-display text-xl font-bold tracking-tight text-white sm:text-3xl">
            {t("onboarding.persona.teacher.title")}
          </h2>

          <p className="mt-2 line-clamp-3 max-w-[150px] font-text text-[11px] leading-relaxed text-zinc-400 sm:max-w-[200px] sm:text-xs">
            {t("onboarding.persona.teacher.desc")}
          </p>
        </div>

        {/* Bottom CTA pill */}
        <div className="relative z-10 flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-[10px] font-semibold tracking-wider text-black uppercase shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all duration-200 group-hover:brightness-110 active:scale-95 sm:px-5 sm:py-2.5 sm:text-xs">
          <span>{t("share.language.continue")}</span>
          <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>
    </div>
  );
};
