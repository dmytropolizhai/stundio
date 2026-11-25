import { useT } from "@/ui/i18n";

type DaySchoolNotesProps = {
  notes: string[];
  allNotes?: string[] | undefined;
  showAll: boolean;
  onToggleShowAll: () => void;
  onShowAll: () => void;
};

export const DaySchoolNotes = ({
  notes,
  allNotes,
  showAll,
  onToggleShowAll,
  onShowAll,
}: DaySchoolNotesProps) => {
  const t = useT();
  const displayNotes = showAll ? (allNotes ?? notes) : notes;
  const hasOtherNotes = (allNotes?.length ?? 0) > notes.length;

  return (
    <>
      {displayNotes.length > 0 && (
        <div className="u-schedule-glass mt-4 rounded-xl px-4 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="m-0 font-text text-caption font-semibold tracking-normal text-muted">
              {t("day.notes")} · {t("lesson.fromSchool")}
            </h3>
            {hasOtherNotes && (
              <button
                type="button"
                onClick={onToggleShowAll}
                className="-my-2.5 inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent px-1 font-text text-micro font-semibold text-strong underline decoration-strong-border underline-offset-3 transition-opacity duration-(--dur-fast) hover:opacity-80"
              >
                {showAll
                  ? t("day.onlyMyGroup")
                  : t("day.allNotes", { count: allNotes?.length ?? 0 })}
              </button>
            )}
          </div>

          <ul className="mt-2 flex list-none flex-col gap-1.5 p-0">
            {displayNotes.map((note, index) => (
              <li key={`${index}-${note}`} className="font-text text-body text-fg">
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.length === 0 && hasOtherNotes && !showAll && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={onShowAll}
            className="u-schedule-glass-chip inline-flex min-h-11 cursor-pointer items-center rounded-pill border-0 px-4 py-2 font-text text-caption font-medium text-muted transition-colors duration-(--dur-fast) hover:text-strong active:scale-(--press-scale)"
          >
            {t("day.allNotes", { count: allNotes?.length ?? 0 })}
          </button>
        </div>
      )}
    </>
  );
};
