import { useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { Card, Icon, IconButton, TextField } from "@/ds";
import { listSubgroups } from "@/lib/edupage";
import { useClasses, type ClassOption } from "../hooks/useClasses.ts";
import { StateMessage } from "../components/StateMessage.tsx";
import { SubgroupPicker } from "./SubgroupPicker.tsx";
import { useT } from "@/ui/i18n";

/**
 * Class picker — onboarding and the "change class" route from Settings.
 *
 * ~122 classes, so it is a filtered list rather than a dropdown, with the user's favourites
 * pinned on top. Building is shown as a hint because two classes can look alike across the
 * annex and the main building.
 *
 * The favourite marker is a colour change on a Lucide star, not a filled glyph: the DS uses
 * monochrome icons throughout and reserves fills for surfaces.
 *
 * A divided class ("pusgrupa") publishes both halves' lessons together, so picking one asks a
 * follow-up question — which half is the user's — before `onPicked` fires. A class with no
 * divided lessons skips straight through, unchanged from before subgroup support existed.
 */
export const ClassPicker = ({ onPicked }: { onPicked?: () => void }) => {
  const t = useT();
  const classes = useClasses();
  const timetables = useAppStore((s) => s.timetables);
  const selected = useAppStore((s) => s.settings.selectedClassId);
  const favorites = useAppStore((s) => s.settings.favorites);
  const setClass = useAppStore((s) => s.setClass);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const refresh = useAppStore((s) => s.refresh);
  const [query, setQuery] = useState("");
  const [askSubgroupFor, setAskSubgroupFor] = useState<ClassOption | null>(null);

  useEffect(() => {
    if (classes.length === 0) {
      void refresh();
    }
  }, [classes.length, refresh]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return classes;
    return classes.filter(
      (c) => c.short.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle),
    );
  }, [classes, query]);

  const pinned = matches.filter((c) => favorites.includes(c.id));
  const rest = matches.filter((c) => !favorites.includes(c.id));

  /*
   * `setClass` is deferred until the whole pick is final for a divided class: the app shell
   * treats `selectedClassId !== null` as "onboarding is done" (`App.tsx`), so committing it
   * before the subgroup question is answered would skip straight past that question.
   */
  const pick = (cls: ClassOption) => {
    const subgroups = listSubgroups(Object.values(timetables), cls.id);
    if (subgroups.length > 1) {
      setAskSubgroupFor(cls);
      return;
    }
    void setClass(cls.id);
    onPicked?.();
  };

  if (askSubgroupFor !== null) {
    return (
      <SubgroupPicker
        cls={askSubgroupFor}
        onDone={() => {
          setAskSubgroupFor(null);
          onPicked?.();
        }}
      />
    );
  }

  const row = (cls: ClassOption, i: number) => {
    const isFavorite = favorites.includes(cls.id);
    const isSelected = cls.id === selected;
    return (
      <li
        key={cls.id}
        className={`flex items-center gap-1 pr-2 ${i === 0 ? "" : "border-t border-hairline"}`}
      >
        <button
          type="button"
          onClick={() => {
            pick(cls);
          }}
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
          onClick={() => {
            void toggleFavorite(cls.id);
          }}
          className={isFavorite ? "text-warning" : "text-ink-300"}
        />
      </li>
    );
  };

  if (classes.length === 0) {
    return <StateMessage icon="cloud" title={t("class.loading")} hint={t("day.noDataHint")} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-gutter pb-3">
        <TextField
          type="search"
          value={query}
          onChange={setQuery}
          placeholder={t("class.search")}
          aria-label={t("class.search")}
          icon="search"
        />
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-gutter pb-[104px]">
        {matches.length === 0 && <StateMessage icon="search" title={t("class.none")} />}

        {pinned.length > 0 && (
          <>
            <h2 className="u-eyebrow flex items-center gap-1.5 pt-2 pb-2">
              <Icon name="star" size={14} />
              {t("class.favorites")}
            </h2>
            <Card radius="lg" className="mb-4 p-0">
              <ul>{pinned.map(row)}</ul>
            </Card>
          </>
        )}

        {rest.length > 0 && (
          <>
            {pinned.length > 0 && <h2 className="u-eyebrow pb-2">{t("class.all")}</h2>}
            <Card radius="lg" className="p-0">
              <ul>{rest.map(row)}</ul>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
