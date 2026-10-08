import { Card } from "@/ds";
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
        <Card tone="sunken" radius="lg" elevation="none" className="mt-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="u-eyebrow">
              {t("day.notes")} · {t("lesson.fromSchool")}
            </h2>
            {hasOtherNotes && (
              <button
                type="button"
                onClick={onToggleShowAll}
                className="font-text text-micro font-medium text-brand hover:underline cursor-pointer"
              >
                {showAll
                  ? t("day.onlyMyGroup")
                  : t("day.allNotes", { count: allNotes?.length ?? 0 })}
              </button>
            )}
          </div>

          <ul className="mt-1.5 flex flex-col gap-1">
            {displayNotes.map((note, index) => (
              <li key={`${index}-${note}`} className="font-text text-body text-fg">
                {note}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {notes.length === 0 && hasOtherNotes && !showAll && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onShowAll}
            className="font-text text-caption text-muted hover:text-fg hover:underline cursor-pointer"
          >
            {t("day.allNotes", { count: allNotes?.length ?? 0 })}
          </button>
        </div>
      )}
    </>
  );
};
