import { Icon, cn } from "@/ds";
import { LANGS, LANG_NAMES, type Lang } from "@/ui/i18n";

type LanguageListProps = {
  label: string;
  selectedLang: Lang;
  onSelect: (lang: Lang) => void;
};

/**
 * Crisp geometric SVG flags — avoids flag emojis, which render as two-letter codes on Windows
 * Chromium and vary across Android/iOS font packs.
 */
const LangFlag = ({ lang }: { lang: Lang }) => {
  const cls =
    "h-5 w-7 shrink-0 overflow-hidden rounded-[4px] shadow-[inset_0_0_0_1px_rgba(18,20,25,0.12)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]";

  switch (lang) {
    case "lv":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="20" fill="#9E3039" />
          <rect y="8" width="28" height="4" fill="#FFFFFF" />
        </svg>
      );
    case "en":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="20" fill="#012169" />
          <path d="M0 0L28 20M28 0L0 20" stroke="#FFFFFF" strokeWidth="4" />
          <path d="M0 0L28 20M28 0L0 20" stroke="#C8102E" strokeWidth="1.6" />
          <path d="M14 0V20M0 10H28" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M14 0V20M0 10H28" stroke="#C8102E" strokeWidth="3.6" />
        </svg>
      );
    case "ua":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="10" fill="#0057B7" />
          <rect y="10" width="28" height="10" fill="#FFD700" />
        </svg>
      );
    case "ru":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="6.67" fill="#FFFFFF" />
          <rect y="6.67" width="28" height="6.67" fill="#0039A6" />
          <rect y="13.33" width="28" height="6.67" fill="#D52B1E" />
        </svg>
      );
    case "lt":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="6.67" fill="#FDB913" />
          <rect y="6.67" width="28" height="6.67" fill="#006A44" />
          <rect y="13.33" width="28" height="6.67" fill="#C1272D" />
        </svg>
      );
    case "et":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="6.67" fill="#0072CE" />
          <rect y="6.67" width="28" height="6.67" fill="#000000" />
          <rect y="13.33" width="28" height="6.67" fill="#FFFFFF" />
        </svg>
      );
    case "pl":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="10" fill="#FFFFFF" />
          <rect y="10" width="28" height="10" fill="#DC143C" />
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="6.67" fill="#000000" />
          <rect y="6.67" width="28" height="6.67" fill="#DD0000" />
          <rect y="13.33" width="28" height="6.67" fill="#FFCC00" />
        </svg>
      );
    case "fr":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="9.33" height="20" fill="#002395" />
          <rect x="9.33" width="9.34" height="20" fill="#FFFFFF" />
          <rect x="18.67" width="9.33" height="20" fill="#ED2939" />
        </svg>
      );
    case "es":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="5" fill="#AA151B" />
          <rect y="5" width="28" height="10" fill="#F1BF00" />
          <rect y="15" width="28" height="5" fill="#AA151B" />
        </svg>
      );
    case "it":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="9.33" height="20" fill="#009246" />
          <rect x="9.33" width="9.34" height="20" fill="#FFFFFF" />
          <rect x="18.67" width="9.33" height="20" fill="#CE2B37" />
        </svg>
      );
    case "pt":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="11" height="20" fill="#006600" />
          <rect x="11" width="17" height="20" fill="#FF0000" />
          <circle cx="11" cy="10" r="3.5" fill="#FFCC00" />
        </svg>
      );
    case "nl":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="6.67" fill="#AE1C28" />
          <rect y="6.67" width="28" height="6.67" fill="#FFFFFF" />
          <rect y="13.33" width="28" height="6.67" fill="#21468B" />
        </svg>
      );
    case "sv":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="20" fill="#006AA7" />
          <rect x="8" width="4" height="20" fill="#FECC00" />
          <rect y="8" width="28" height="4" fill="#FECC00" />
        </svg>
      );
    case "fi":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="20" fill="#FFFFFF" />
          <rect x="8" width="4.5" height="20" fill="#003580" />
          <rect y="7.75" width="28" height="4.5" fill="#003580" />
        </svg>
      );
    case "no":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="20" fill="#BA0C2F" />
          <rect x="7" width="6" height="20" fill="#FFFFFF" />
          <rect y="7" width="28" height="6" fill="#FFFFFF" />
          <rect x="8.5" width="3" height="20" fill="#00205B" />
          <rect y="8.5" width="28" height="3" fill="#00205B" />
        </svg>
      );
    case "da":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="20" fill="#C60C30" />
          <rect x="8" width="3.5" height="20" fill="#FFFFFF" />
          <rect y="8.25" width="28" height="3.5" fill="#FFFFFF" />
        </svg>
      );
    case "cs":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="10" fill="#FFFFFF" />
          <rect y="10" width="28" height="10" fill="#D7141A" />
          <polygon points="0,0 14,10 0,20" fill="#11457E" />
        </svg>
      );
    case "sk":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="6.67" fill="#FFFFFF" />
          <rect y="6.67" width="28" height="6.67" fill="#0B4EA2" />
          <rect y="13.33" width="28" height="6.67" fill="#EE1C25" />
          <path
            d="M5.5 4.5H12.5V10.5C12.5 13.3 9 15.5 9 15.5C9 15.5 5.5 13.3 5.5 10.5Z"
            fill="#EE1C25"
            stroke="#FFFFFF"
            strokeWidth="1"
          />
          <path
            d="M6.3 12.2C7 11.4 7.8 11.4 8.3 12C8.7 11.2 9.3 11.2 9.7 12C10.2 11.4 11 11.4 11.7 12.2C10.9 13.7 9 14.8 9 14.8C9 14.8 7.1 13.7 6.3 12.2Z"
            fill="#0B4EA2"
          />
          <path
            d="M9 5.7V11.8M7.5 7.4H10.5M7 9.4H11"
            stroke="#FFFFFF"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
      );
    case "hu":
      return (
        <svg viewBox="0 0 28 20" aria-hidden="true" className={cls}>
          <rect width="28" height="6.67" fill="#CD2A3E" />
          <rect y="6.67" width="28" height="6.67" fill="#FFFFFF" />
          <rect y="13.33" width="28" height="6.67" fill="#436F4D" />
        </svg>
      );
  }
};

/**
 * Continuous liquid-glass radio slab matching the Home schedule and welcome specimens.
 * Each option is rendered in its own native language name paired with its flag.
 */
export const LanguageList = ({ label, selectedLang, onSelect }: LanguageListProps) => {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="u-schedule-glass flex min-h-0 w-full flex-col divide-y divide-(--schedule-divider) overflow-y-auto rounded-xl"
    >
      {LANGS.map((key: Lang) => {
        const active = key === selectedLang;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              onSelect(key);
            }}
            className={cn(
              "group flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 px-4.5 py-3.5 text-left",
              "transition-[background-color,transform] duration-(--dur-fast) ease-(--ease-standard)",
              "hover:bg-(--schedule-row-hover) active:scale-[0.99] active:duration-(--dur-instant)",
              "focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
              active && "bg-(--schedule-row-hover)",
            )}
          >
            <div className="flex items-center gap-3.5">
              <LangFlag lang={key} />
              <span
                className={cn("font-text text-body font-bold", active ? "text-strong" : "text-fg")}
              >
                {LANG_NAMES[key]}
              </span>
            </div>

            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow,transform] duration-(--dur-fast) ease-(--ease-standard)",
                active
                  ? "bg-inverse text-on-inverse"
                  : "bg-transparent inset-ring inset-ring-strong-border/50",
              )}
            >
              {active && <Icon name="check" size={14} />}
            </span>
          </button>
        );
      })}
    </div>
  );
};
