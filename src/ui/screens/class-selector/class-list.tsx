import { useMemo, type ReactNode } from "react";
import { Icon } from "@/ds";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { useT } from "@/ui/i18n";
import type { ClassOption } from "@/ui/hooks/useClasses.ts";
import { ClassRow } from "./class-row.tsx";
import { groupClassesByDepartment } from "./group-classes.ts";

type ClassListProps = {
  classes: ClassOption[];
  favorites: string[];
  selected: string | null;
  onSelect: (cls: ClassOption) => void;
  onToggleFavorite: (id: string) => void;
};

/**
 * Department-indexed liquid-glass matrix with a pinned Favorites slab at the top.
 * Uses a 2-column grid on phones and expands to 3 columns on tablet/desktop.
 */
export const ClassList = ({
  classes,
  favorites,
  selected,
  onSelect,
  onToggleFavorite,
}: ClassListProps) => {
  const t = useT();

  const pinned = useMemo(
    () => classes.filter((cls) => favorites.includes(cls.id)),
    [classes, favorites],
  );
  const rest = useMemo(
    () => classes.filter((cls) => !favorites.includes(cls.id)),
    [classes, favorites],
  );
  const departmentGroups = useMemo(() => groupClassesByDepartment(rest), [rest]);

  if (classes.length === 0) {
    return (
      <div className="pt-4">
        <StateMessage icon="search" title={t("class.none")} />
      </div>
    );
  }

  const renderGrid = (items: ClassOption[]) => (
    <ul className="grid grid-cols-2 gap-1.5 tablet:grid-cols-3">
      {items.map((cls) => (
        <ClassRow
          key={cls.id}
          cls={cls}
          isFavorite={favorites.includes(cls.id)}
          isSelected={cls.id === selected}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-5 pb-2">
      {pinned.length > 0 && (
        <GlassMatrixSection
          title={t("class.favorites")}
          count={pinned.length}
          icon={<Icon name="star" size={14} className="text-caution" />}
        >
          {renderGrid(pinned)}
        </GlassMatrixSection>
      )}

      {departmentGroups.length > 0 && (
        <div className="flex flex-col gap-4">
          {pinned.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <h2 className="u-eyebrow">{t("class.all")}</h2>
              <span className="u-data text-micro text-muted">{rest.length}</span>
            </div>
          )}

          {departmentGroups.map((group) => (
            <GlassMatrixSection
              key={group.department}
              title={group.department}
              count={group.items.length}
            >
              {renderGrid(group.items)}
            </GlassMatrixSection>
          ))}
        </div>
      )}
    </div>
  );
};

type GlassMatrixSectionProps = {
  title: string;
  count: number;
  icon?: ReactNode;
  children: ReactNode;
};

const GlassMatrixSection = ({ title, count, icon, children }: GlassMatrixSectionProps) => (
  <section className="flex flex-col gap-2">
    <div className="flex items-center justify-between px-1">
      <h2 className="u-eyebrow flex items-center gap-1.5">
        {icon}
        {title}
      </h2>
      <span className="u-data text-micro text-muted">{count}</span>
    </div>

    <div className="u-schedule-glass rounded-xl p-2">{children}</div>
  </section>
);
