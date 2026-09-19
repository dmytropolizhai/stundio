import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { ClassRow } from "./class-row.tsx";
import { useT } from "@/ui/i18n";
import type { ClassOption } from "@/ui/hooks/useClasses";
import { Card, Icon } from "@/ds";
import type { PropsWithChildren } from "react";

type ClassListProps = {
  classes: ClassOption[];
  favorites: string[];
  selected: string | null;
  onSelect: (cls: ClassOption) => void;
  onToggleFavorite: (id: string) => void;
};

export const ClassList = ({
  classes,
  favorites,
  selected,
  onSelect,
  onToggleFavorite,
}: ClassListProps) => {
  const t = useT();

  const pinned = classes.filter((cls) => favorites.includes(cls.id));
  const rest = classes.filter((cls) => !favorites.includes(cls.id));

  if (classes.length === 0) {
    return <StateMessage icon="search" title={t("class.none")} />;
  }

  const renderRows = (items: ClassOption[]) => (
    <ul>
      {items.map((cls, index) => (
        <ClassRow
          key={cls.id}
          cls={cls}
          index={index}
          isFavorite={favorites.includes(cls.id)}
          isSelected={cls.id === selected}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </ul>
  );

  return (
    <>
      {pinned.length > 0 && (
        <ClassListSection title={t("class.favorites")} showIcon>
          {renderRows(pinned)}
        </ClassListSection>
      )}

      {rest.length > 0 && (
        <>
          {pinned.length > 0 && <h2 className="u-eyebrow pb-2">{t("class.all")}</h2>}

          <ClassListSection title={pinned.length > 0 ? "" : t("class.all")}>
            {renderRows(rest)}
          </ClassListSection>
        </>
      )}
    </>
  );
};

type ClassListSectionProps = PropsWithChildren & {
  title: string;
  showIcon?: boolean;
};

const ClassListSection = ({ title, showIcon = false, children }: ClassListSectionProps) => {
  return (
    <section>
      <h2 className="u-eyebrow flex items-center gap-1.5 pt-2 pb-2">
        {showIcon && <Icon name="star" size={14} />}
        {title}
      </h2>

      <Card radius="lg" className="mb-4 p-0">
        {children}
      </Card>
    </section>
  );
};
