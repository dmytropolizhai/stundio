import { IconButton, cn } from "@/ds";
import { useT } from "@/ui/i18n";
import type { ClassOption } from "@/ui/hooks/useClasses.ts";

type ClassRowProps = {
  cls: ClassOption;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: (cls: ClassOption) => void;
  onToggleFavorite: (id: string) => void;
};

/**
 * Tactile class tile inside a department or favorites liquid-glass slab.
 * Selection performs a full Night / Day inverse fill swap (`bg-inverse text-on-inverse`).
 */
export const ClassRow = ({
  cls,
  isFavorite,
  isSelected,
  onSelect,
  onToggleFavorite,
}: ClassRowProps) => {
  const t = useT();

  return (
    <li className="relative min-w-0">
      <button
        type="button"
        onClick={() => {
          onSelect(cls);
        }}
        aria-pressed={isSelected}
        className={cn(
          "flex min-h-15 w-full cursor-pointer flex-col justify-center rounded-lg border-0 py-2.5 pr-10 pl-3.5 text-left",
          "transition-[background-color,color,transform] duration-(--dur-fast) ease-(--ease-standard)",
          "active:scale-(--press-scale-tile) active:duration-(--dur-instant)",
          "focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
          isSelected
            ? "bg-inverse text-on-inverse shadow-card"
            : "bg-transparent text-strong hover:bg-(--schedule-row-hover)",
        )}
      >
        <span className="truncate font-text text-body leading-snug font-bold">{cls.short}</span>
        <span
          className={cn(
            "mt-0.5 truncate font-text text-micro leading-tight font-medium",
            isSelected ? "text-on-inverse/75" : "text-muted",
          )}
        >
          {cls.buildings.join(" · ")}
        </span>
      </button>

      <IconButton
        icon="star"
        variant="bare"
        size="sm"
        label={isFavorite ? t("class.favorite.remove") : t("class.favorite.add")}
        aria-pressed={isFavorite}
        onClick={() => {
          onToggleFavorite(cls.id);
        }}
        className={cn(
          "absolute top-1/2 right-1 -translate-y-1/2",
          isFavorite
            ? "text-caution"
            : isSelected
              ? "text-on-inverse/55 hover:bg-on-inverse/12 hover:text-on-inverse"
              : "text-muted/45 hover:text-strong",
        )}
      />
    </li>
  );
};
