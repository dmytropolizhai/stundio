import { IconButton } from "@/ds";
import { useT } from "@/ui/i18n";
import type { ClassOption } from "@/ui/hooks/useClasses";

type ClassRowProps = {
  cls: ClassOption;
  index: number;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: (cls: ClassOption) => void;
  onToggleFavorite: (id: string) => void;
};

export const ClassRow = ({
  cls,
  index,
  isFavorite,
  isSelected,
  onSelect,
  onToggleFavorite,
}: ClassRowProps) => {
  const t = useT();

  return (
    <li className={`flex items-center gap-1 pr-2 ${index === 0 ? "" : "border-t border-hairline"}`}>
      <button
        type="button"
        onClick={() => onSelect(cls)}
        aria-pressed={isSelected}
        className={`flex min-w-0 flex-1 cursor-pointer items-baseline gap-2 border-0 bg-transparent px-4 py-3.5 text-left ${
          isSelected ? "text-brand-strong" : "text-strong"
        }`}
      >
        <span className="font-text text-body font-bold">{cls.short}</span>

        <span className="truncate font-text text-caption text-muted">
          {cls.buildings.join(" · ")}
        </span>
      </button>

      <IconButton
        icon="star"
        variant="bare"
        size="sm"
        label={isFavorite ? t("class.favorite.remove") : t("class.favorite.add")}
        aria-pressed={isFavorite}
        onClick={() => onToggleFavorite(cls.id)}
        className={isFavorite ? "text-warning" : "text-ink-300"}
      />
    </li>
  );
};
