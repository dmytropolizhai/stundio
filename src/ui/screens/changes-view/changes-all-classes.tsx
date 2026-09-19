import { useMemo } from "react";
import { Badge, TextField } from "@/ds";
import type { Substitution } from "@/lib/edupage";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { useT } from "@/ui/i18n";
import { ChangesSchoolNotes } from "./changes-school-notes.tsx";
import { ChangesSubstCard } from "./changes-subst-card.tsx";
import { groupSubstitutionsByClass } from "./group-substitutions.ts";

type ChangesAllClassesProps = {
  items: readonly Substitution[];
  notes: readonly string[] | undefined;
  selectedClassShort: string | null;
  search: string;
  onSearchChange: (search: string) => void;
};

export const ChangesAllClasses = ({
  items,
  notes,
  selectedClassShort,
  search,
  onSearchChange,
}: ChangesAllClassesProps) => {
  const t = useT();

  const groups = useMemo(
    () => groupSubstitutionsByClass(items, search, selectedClassShort),
    [items, search, selectedClassShort],
  );

  const searching = search.trim() !== "";

  if (items.length === 0 && (notes?.length ?? 0) === 0) {
    return (
      <div className="mt-6">
        <StateMessage
          icon="coffee"
          title={t("changes.emptyAll")}
          hint={t("changes.emptyAllHint")}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-5">
      {/* The field stays mounted when a query matches nothing, so the search can be
          corrected in place instead of being lost with the list. */}
      <TextField
        value={search}
        onChange={onSearchChange}
        placeholder={t("changes.searchPlaceholder")}
        icon="search"
      />

      {groups.length === 0 && searching ? (
        <div className="mt-2">
          <StateMessage icon="search" title={t("changes.searchNoResults")} />
        </div>
      ) : (
        <>
          {!searching && <ChangesSchoolNotes notes={notes} />}

          <div className="flex flex-col gap-4">
            {groups.map(([className, classItems]) => {
              const isMyClass = className === selectedClassShort;

              return (
                <div key={className} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <Badge tone={isMyClass ? "brand" : "quiet"}>
                      {className}
                      {isMyClass ? ` · ${t("changes.filter.myClass")}` : ""}
                    </Badge>
                    <span className="font-text text-caption text-muted">
                      {t("changes.count", { n: classItems.length })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {classItems.map((item, idx) => (
                      <ChangesSubstCard key={`${className}-${idx}`} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
