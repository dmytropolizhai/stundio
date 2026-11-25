import { Icon } from "@/ds";

export type InstitutionId = "rvt";

type Institution = {
  id: InstitutionId;
  name: string;
  meta: string;
};

/**
 * Institutions supported by Stundio. Currently only Rīgas Valsts tehnikums is available; keeping
 * this as a typed list makes adding future EduPage schools a data change rather than a rewrite.
 */
const INSTITUTIONS: readonly Institution[] = [
  {
    id: "rvt",
    name: "Rīgas Valsts tehnikums",
    meta: "RVT · pikcrvt.edupage.org",
  },
];

type InstitutionListProps = {
  label: string;
  hint: string;
  selectedId: InstitutionId;
  onSelect: (id: InstitutionId) => void;
};

/**
 * Liquid-glass radio slab matching `LanguageList` and the Home schedule.
 */
export const InstitutionList = ({ label, hint, selectedId, onSelect }: InstitutionListProps) => {
  return (
    <div className="flex w-full flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={label}
        className="u-schedule-glass flex w-full flex-col divide-y divide-(--schedule-divider) overflow-hidden rounded-xl"
      >
        {INSTITUTIONS.map((inst) => {
          const active = inst.id === selectedId;
          return (
            <button
              key={inst.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                onSelect(inst.id);
              }}
              className={`group flex min-h-16 w-full cursor-pointer items-center justify-between gap-3.5 px-4.5 py-3.5 text-left transition-[background-color,transform] duration-(--dur-fast) ease-(--ease-standard) hover:bg-(--schedule-row-hover) active:scale-[0.99] active:duration-(--dur-instant) focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
                active ? "bg-(--schedule-row-hover)" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span
                  aria-hidden="true"
                  className="u-schedule-room-pill flex size-10 shrink-0 items-center justify-center rounded-sm text-strong"
                >
                  <Icon name="building-2" size={18} />
                </span>

                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-text text-body font-bold text-strong">
                    {inst.name}
                  </span>
                  <span className="u-data truncate text-[12px] text-muted">{inst.meta}</span>
                </div>
              </div>

              <span
                aria-hidden="true"
                className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow,transform] duration-(--dur-fast) ease-(--ease-standard) ${
                  active
                    ? "bg-inverse text-on-inverse"
                    : "bg-transparent inset-ring inset-ring-strong-border/50"
                }`}
              >
                {active && <Icon name="check" size={14} />}
              </span>
            </button>
          );
        })}
      </div>

      <p className="px-1 font-text text-caption text-muted">{hint}</p>
    </div>
  );
};
