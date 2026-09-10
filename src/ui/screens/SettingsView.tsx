import { useMemo } from "react";
import { useAppStore } from "../../store/index.ts";
import { listBuildings } from "../../lib/edupage/index.ts";
import type { Settings } from "../../db/index.ts";
import { useSelectedClass } from "../hooks/useClasses.ts";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { LANGS, LANG_NAMES, useT } from "../i18n/index.ts";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="px-4 py-3">
    <h2 className="pb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">{title}</h2>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  </section>
);

/** Segmented control — used for theme and language, both small closed sets. */
const Segmented = <T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) => (
  <div className="flex gap-1 p-2" role="radiogroup" aria-label={label}>
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        role="radio"
        aria-checked={option.id === value}
        onClick={() => {
          onChange(option.id);
        }}
        className={`flex-1 rounded-lg py-2 text-sm ${
          option.id === value
            ? "bg-accent-500 font-medium text-white"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

/**
 * Settings. Every control writes straight through the store to the cache, so a change
 * survives a cold start without a save button.
 */
export const SettingsView = ({ onPickClass }: { onPickClass: () => void }) => {
  const t = useT();
  const selectedClass = useSelectedClass();
  const metas = useAppStore((s) => s.metas);
  const settings = useAppStore((s) => s.settings);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const setBuilding = useAppStore((s) => s.setBuilding);
  const setTheme = useAppStore((s) => s.setTheme);
  const setLang = useAppStore((s) => s.setLang);
  const refresh = useAppStore((s) => s.refresh);

  const buildings = useMemo(() => listBuildings(metas), [metas]);

  const themes: { id: Settings["theme"]; label: string }[] = [
    { id: "system", label: t("theme.system") },
    { id: "light", label: t("theme.light") },
    { id: "dark", label: t("theme.dark") },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-slate-200 px-4 pt-[var(--app-inset-top)] pb-2 text-center dark:border-slate-800">
        <h1 className="pt-2 font-semibold text-slate-900 dark:text-slate-100">
          {t("settings.title")}
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <Section title={t("settings.class")}>
          <button
            type="button"
            onClick={onPickClass}
            className="flex w-full items-center justify-between px-3 py-3 text-left"
          >
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {selectedClass?.short ?? t("day.noClass")}
            </span>
            <span className="text-sm text-accent-600 dark:text-accent-400">
              {t("settings.change")}
            </span>
          </button>
        </Section>

        {buildings.length > 1 && (
          <Section title={t("settings.building")}>
            <Segmented
              label={t("settings.building")}
              value={settings.building ?? ""}
              options={[
                { id: "", label: t("settings.buildingAuto") },
                ...buildings.map((b) => ({ id: b, label: b })),
              ]}
              onChange={(value) => {
                void setBuilding(value === "" ? null : value);
              }}
            />
          </Section>
        )}

        <Section title={t("settings.theme")}>
          <Segmented
            label={t("settings.theme")}
            value={settings.theme}
            options={themes}
            onChange={(value) => {
              void setTheme(value);
            }}
          />
        </Section>

        <Section title={t("settings.language")}>
          <Segmented
            label={t("settings.language")}
            value={settings.lang}
            options={LANGS.map((id) => ({ id, label: LANG_NAMES[id] }))}
            onChange={(value) => {
              void setLang(value);
            }}
          />
        </Section>

        <Section title={t("settings.data")}>
          <div className="flex items-center justify-between px-3 py-3">
            <SyncBadge />
            <button
              type="button"
              disabled={syncStatus === "syncing"}
              onClick={() => {
                void refresh({ force: true });
              }}
              className="rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {t("sync.refresh")}
            </button>
          </div>
        </Section>

        <Section title={t("settings.about")}>
          <p className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
            {t("settings.aboutText")}
          </p>
        </Section>
      </div>
    </div>
  );
};
