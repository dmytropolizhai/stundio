import { useMemo, useState } from "react";
import { useAppStore } from "../../store/index.ts";
import { useClasses, type ClassOption } from "../hooks/useClasses.ts";
import { StateMessage } from "../components/StateMessage.tsx";
import { useT } from "../i18n/index.ts";

/**
 * Class picker — onboarding and the "change class" route from Settings.
 *
 * ~122 classes, so it is a filtered list rather than a dropdown, with the user's favourites
 * pinned on top. Building is shown as a hint because two classes can look alike across the
 * annex and the main building.
 */
export const ClassPicker = ({ onPicked }: { onPicked?: () => void }) => {
  const t = useT();
  const classes = useClasses();
  const selected = useAppStore((s) => s.settings.selectedClassId);
  const favorites = useAppStore((s) => s.settings.favorites);
  const setClass = useAppStore((s) => s.setClass);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return classes;
    return classes.filter(
      (c) => c.short.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle),
    );
  }, [classes, query]);

  const pinned = matches.filter((c) => favorites.includes(c.id));
  const rest = matches.filter((c) => !favorites.includes(c.id));

  const pick = (id: string) => {
    void setClass(id);
    onPicked?.();
  };

  const row = (cls: ClassOption) => (
    <li key={cls.id} className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          pick(cls.id);
        }}
        aria-pressed={cls.id === selected}
        className={`flex min-w-0 flex-1 items-baseline gap-2 rounded-lg px-3 py-2.5 text-left ${
          cls.id === selected
            ? "bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400"
            : "text-slate-800 dark:text-slate-100"
        }`}
      >
        <span className="font-medium">{cls.short}</span>
        <span className="truncate text-xs text-slate-500 dark:text-slate-400">
          {cls.buildings.join(" · ")}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          void toggleFavorite(cls.id);
        }}
        aria-label={
          favorites.includes(cls.id) ? t("class.favorite.remove") : t("class.favorite.add")
        }
        className="px-3 py-2 text-lg text-slate-300 dark:text-slate-600"
      >
        <span className={favorites.includes(cls.id) ? "text-amber-400" : ""}>★</span>
      </button>
    </li>
  );

  if (classes.length === 0) {
    return <StateMessage icon="⏳" title={t("class.loading")} hint={t("day.noDataHint")} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-4 pb-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder={t("class.search")}
          aria-label={t("class.search")}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-accent-400 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {matches.length === 0 && <StateMessage icon="🔍" title={t("class.none")} />}

        {pinned.length > 0 && (
          <>
            <h2 className="px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
              {t("class.favorites")}
            </h2>
            <ul>{pinned.map(row)}</ul>
          </>
        )}

        {rest.length > 0 && (
          <>
            {pinned.length > 0 && (
              <h2 className="px-3 pt-3 pb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
                {t("class.all")}
              </h2>
            )}
            <ul>{rest.map(row)}</ul>
          </>
        )}
      </div>
    </div>
  );
};
