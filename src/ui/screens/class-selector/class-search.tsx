import { Icon, cn } from "@/ds";
import type { Building } from "@/lib/edupage";
import { useT } from "@/ui/i18n";

type ClassSearchProps = {
  value: string;
  onChange: (value: string) => void;
  years: string[];
  selectedYear: string | null;
  onSelectYear: (year: string | null) => void;
  buildings: Building[];
  selectedBuilding: Building | null;
  onSelectBuilding: (building: Building | null) => void;
  scrolled?: boolean;
};

type FilterPillProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
};

const FilterPill = ({ label, selected, onClick }: FilterPillProps) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={cn(
      "inline-flex h-9 shrink-0 cursor-pointer items-center rounded-pill px-3.5 font-text text-caption font-bold whitespace-nowrap",
      "transition-[background-color,color,transform] duration-(--dur-fast) ease-(--ease-standard)",
      "active:scale-(--press-scale) active:duration-(--dur-instant)",
      selected
        ? "bg-inverse text-on-inverse shadow-none"
        : "u-schedule-glass-chip text-fg hover:text-strong",
    )}
  >
    {label}
  </button>
);

/**
 * Sticky liquid-glass search capsule and dynamic Year / Building quick-filter strip.
 * Years and buildings are derived from the cached timetable rather than hardcoded.
 */
export const ClassSearch = ({
  value,
  onChange,
  years,
  selectedYear,
  onSelectYear,
  buildings,
  selectedBuilding,
  onSelectBuilding,
  scrolled = false,
}: ClassSearchProps) => {
  const t = useT();
  const hasFilters = years.length > 1 || buildings.length > 1;
  const isAll = selectedYear === null && selectedBuilding === null;

  return (
    <div className="sticky top-0 z-10 isolate w-full pt-2 pb-3">
      {/*
       * Full-bleed frosted backdrop that fades in only once this bar docks at the top of the
       * scroll viewport, with a soft bottom mask so cards blur away without a hard edge.
       */}
      <div
        aria-hidden="true"
        data-scrolled={scrolled ? "true" : "false"}
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -bottom-5 -z-10 transition-opacity duration-(--dur-base) ease-(--ease-standard)",
          scrolled ? "opacity-100" : "opacity-0",
        )}
        style={{
          background:
            "linear-gradient(to bottom, color-mix(in oklab, var(--bg-app) 58%, transparent) 0%, color-mix(in oklab, var(--bg-app) 36%, transparent) 68%, transparent 100%)",
          backdropFilter: "blur(var(--blur-glass)) saturate(165%)",
          WebkitBackdropFilter: "blur(var(--blur-glass)) saturate(165%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 68%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 68%, transparent 100%)",
        }}
      />

      <div className="mx-auto flex w-full max-w-screen flex-col gap-2.5 px-gutter tablet:max-w-[640px]">
        <label className="u-schedule-glass-chip flex h-12 items-center gap-2.5 rounded-pill px-4 text-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
          <Icon name="search" size={18} className="shrink-0 text-muted" />
          <input
            type="search"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            placeholder={t("class.search")}
            aria-label={t("class.search")}
            className="min-w-0 flex-1 border-0 bg-transparent font-text text-body text-strong outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {value !== "" && (
            <button
              type="button"
              aria-label={t("class.search.clear")}
              onClick={() => {
                onChange("");
              }}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-pill text-muted transition-colors duration-(--dur-fast) hover:bg-(--schedule-row-hover) hover:text-strong active:scale-(--press-scale)"
            >
              <Icon name="x" size={15} />
            </button>
          )}
        </label>

        {hasFilters && (
          <div
            className="no-scrollbar -mx-gutter flex items-center gap-2 overflow-x-auto px-gutter py-0.5"
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 24px), transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 24px), transparent 100%)",
            }}
          >
            <FilterPill
              label={t("class.filter.all")}
              selected={isAll}
              onClick={() => {
                onSelectYear(null);
                onSelectBuilding(null);
              }}
            />

            {years.map((year) => (
              <FilterPill
                key={year}
                label={t("class.filter.year", { year })}
                selected={selectedYear === year}
                onClick={() => {
                  onSelectYear(selectedYear === year ? null : year);
                }}
              />
            ))}

            {buildings.length > 1 &&
              buildings.map((building) => (
                <FilterPill
                  key={building}
                  label={building}
                  selected={selectedBuilding === building}
                  onClick={() => {
                    onSelectBuilding(selectedBuilding === building ? null : building);
                  }}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
