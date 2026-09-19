import { Icon } from "@/ds";
import { useT } from "@/ui/i18n";

type OnboardingPersonaProps = {
  onSelectPersona: (persona: "student" | "teacher") => void;
};

export const OnboardingPersona = ({ onSelectPersona }: OnboardingPersonaProps) => {
  const t = useT();

  return (
    <div className="relative flex h-full w-full min-h-0 flex-1 select-none overflow-hidden bg-black font-text">
      {/* Top Header overlay spanning both sides */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center px-4 pt-[calc(var(--spacing(6))+var(--app-inset-top))] text-center">
        <div className="mb-1.5 flex items-center gap-2 opacity-80">
          <span className="h-px w-6 bg-white sm:w-10" />
          <span className="font-mono text-[9px] font-bold tracking-[0.35em] text-white drop-shadow sm:text-[11px]">
            STUNDIO
          </span>
          <span className="h-px w-6 bg-white sm:w-10" />
        </div>
        <h1 className="font-display text-base font-black tracking-[0.16em] uppercase text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-2xl sm:tracking-[0.2em]">
          {t("onboarding.persona.title")}
        </h1>
        <p className="mt-1 hidden max-w-xs text-[11px] font-medium text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] sm:block sm:text-xs">
          {t("onboarding.persona.subtitle")}
        </p>
      </div>

      {/* Central Seam line */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-linear-to-b from-transparent via-white/30 to-transparent" />

      {/* Central "CHOOSE YOUR SIDE" badge (Star Wars reference aesthetic) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
        <div className="flex items-center gap-2 rounded-full border border-white/25 bg-neutral-950/90 px-3.5 py-1.5 shadow-[0_0_24px_rgba(0,0,0,0.8)] backdrop-blur-md">
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
        className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-between overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#f6f4ee] via-[#ebe6da] to-[#ded6c5] px-3 pb-[calc(var(--spacing(8))+var(--app-inset-bottom))] pt-[calc(var(--spacing(24))+var(--app-inset-top))] text-center text-[#1c1917] transition-all duration-300 ease-out hover:flex-[1.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-100"
      >
        {/* Ambient subtle light glow */}
        <div className="pointer-events-none absolute -left-12 top-1/3 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 text-black/[0.03] dark:text-white/[0.03]">
          <Icon name="graduation-cap" size={180} />
        </div>

        {/* Top tag */}
        <div className="relative z-10 flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2.5 py-0.5 text-[9px] font-bold tracking-widest text-slate-700 uppercase backdrop-blur-sm dark:border-white/15 dark:bg-white/10 dark:text-sky-300 sm:text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          <span>ES MĀCOS</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center px-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-black/10 bg-white/90 text-sky-600 shadow-lg shadow-sky-500/10 transition-transform duration-300 group-hover:scale-110 dark:border-white/15 dark:bg-sky-950/60 dark:text-sky-400 dark:shadow-sky-500/20 sm:h-20 sm:w-20">
            <Icon name="graduation-cap" size={32} />
          </div>

          <h2 className="mt-4 font-display text-xl font-black tracking-tight text-[#1c1917] dark:text-white sm:text-3xl">
            {t("onboarding.persona.student.title")}
          </h2>

          <p className="mt-2 line-clamp-3 max-w-[150px] text-center font-text text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 sm:max-w-[200px] sm:text-xs">
            {t("onboarding.persona.student.desc")}
          </p>
        </div>

        {/* Bottom CTA pill */}
        <div className="relative z-10 flex items-center gap-1.5 rounded-full border border-black/15 bg-black/90 px-4 py-2 text-[10px] font-bold tracking-wider text-white uppercase shadow-md transition-all duration-200 group-hover:bg-black group-hover:shadow-lg active:scale-95 dark:border-white/20 dark:bg-white/15 dark:text-white dark:group-hover:bg-white/25 sm:px-5 sm:py-2.5 sm:text-xs">
          <span>{t("share.language.continue")}</span>
          <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>

      {/* RIGHT HALF: TEACHER (Dark / Sith / Kylo Ren Side) */}
      <button
        type="button"
        onClick={() => onSelectPersona("teacher")}
        aria-label={`${t("onboarding.persona.teacher.title")} - ${t("onboarding.persona.teacher.desc")}`}
        className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#09090b] via-[#121217] to-[#040405] px-3 pb-[calc(var(--spacing(8))+var(--app-inset-bottom))] pt-[calc(var(--spacing(24))+var(--app-inset-top))] text-center text-white transition-all duration-300 ease-out hover:flex-[1.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        {/* Lightsaber beam along the right edge */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-2.5 bg-gradient-to-l from-amber-500/50 via-rose-600/30 to-transparent blur-sm sm:w-4" />
        <div className="pointer-events-none absolute -right-16 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-amber-500/15 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 text-white/[0.03]">
          <Icon name="briefcase" size={180} />
        </div>

        {/* Top tag */}
        <div className="relative z-10 flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-bold tracking-widest text-amber-300 uppercase backdrop-blur-sm sm:text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
          <span>ES MĀCU</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center px-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-zinc-900/90 text-amber-400 shadow-lg shadow-amber-500/20 transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20">
            <Icon name="briefcase" size={32} />
          </div>

          <h2 className="mt-4 font-display text-xl font-black tracking-tight text-white sm:text-3xl">
            {t("onboarding.persona.teacher.title")}
          </h2>

          <p className="mt-2 line-clamp-3 max-w-[150px] text-center font-text text-[11px] leading-relaxed text-zinc-400 sm:max-w-[200px] sm:text-xs">
            {t("onboarding.persona.teacher.desc")}
          </p>
        </div>

        {/* Bottom CTA pill */}
        <div className="relative z-10 flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-[10px] font-bold tracking-wider text-black uppercase shadow-[0_0_16px_rgba(245,158,11,0.35)] transition-all duration-200 group-hover:brightness-110 active:scale-95 sm:px-5 sm:py-2.5 sm:text-xs">
          <span>{t("share.language.continue")}</span>
          <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>
    </div>
  );
};
