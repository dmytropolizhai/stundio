import { useEffect, useMemo, useState } from "react";
import { Button } from "@/ds";
import { listSubgroups, type Building } from "@/lib/edupage";
import { useAppStore } from "@/store";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { useBackButton } from "@/ui/hooks/useBackButton.ts";
import { useClasses, type ClassOption } from "@/ui/hooks/useClasses.ts";
import { useT } from "@/ui/i18n";
import { SubgroupPicker } from "@/ui/screens/subgroup-picker";
import { ClassList } from "./class-list.tsx";
import { ClassSearch } from "./class-search.tsx";
import { availableBuildings, availableYears, filterClasses } from "./group-classes.ts";

type ClassSelectorProps = {
  mode?: "onboarding" | "switch";
  onBack?: () => void;
  onPicked?: () => void;
};

/**
 * Night / Day liquid-glass class selector shared by first-run onboarding and the in-app class
 * switcher. Students narrow 120+ RVT classes with live search and dynamic Year / Building filter
 * pills, highlight their class in a department-indexed glass matrix, and confirm via the bottom
 * Continue CTA (or step into `SubgroupPicker` when the class is split into subgroups).
 */
export const ClassSelector = ({ mode = "onboarding", onBack, onPicked }: ClassSelectorProps) => {
  const t = useT();
  const classes = useClasses();
  const timetables = useAppStore((s) => s.timetables);
  const selected = useAppStore((s) => s.settings.selectedClassId);
  const favorites = useAppStore((s) => s.settings.favorites);
  const setClass = useAppStore((s) => s.setClass);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const refresh = useAppStore((s) => s.refresh);

  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [draftId, setDraftId] = useState<string | null>(selected);
  const [askSubgroupFor, setAskSubgroupFor] = useState<ClassOption | null>(null);

  useBackButton(
    () => {
      setAskSubgroupFor(null);
    },
    { enabled: askSubgroupFor !== null, priority: 20 },
  );

  useEffect(() => {
    if (classes.length === 0) {
      void refresh();
    }
  }, [classes.length, refresh]);

  const years = useMemo(() => availableYears(classes), [classes]);
  const buildings = useMemo(() => availableBuildings(classes), [classes]);

  const matches = useMemo(
    () => filterClasses(classes, query, selectedYear, selectedBuilding),
    [classes, query, selectedYear, selectedBuilding],
  );

  const draftClass = useMemo(
    () => (draftId === null ? null : (classes.find((c) => c.id === draftId) ?? null)),
    [classes, draftId],
  );

  const confirm = () => {
    if (draftClass === null) return;
    const subgroups = listSubgroups(Object.values(timetables), draftClass.id);

    if (subgroups.length > 1) {
      setAskSubgroupFor(draftClass);
      return;
    }

    void setClass(draftClass.id);
    onPicked?.();
  };

  if (askSubgroupFor !== null) {
    return (
      <SubgroupPicker
        cls={askSubgroupFor}
        onBack={() => {
          setAskSubgroupFor(null);
        }}
        onDone={() => {
          setAskSubgroupFor(null);
          onPicked?.();
        }}
      />
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-app">
      {/* Soft top ambient lamp glow matching OnboardingIntro and OnboardingLanguage. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[48%]"
        style={{
          background:
            "radial-gradient(68% 62% at 50% 24%, color-mix(in oklab, var(--lamp) 16%, transparent) 0%, transparent 74%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-screen flex-1 flex-col px-gutter pt-[calc(--spacing(4)+var(--app-inset-top))] tablet:max-w-[640px] tablet:pt-8">
        {mode === "switch" ? (
          <header className="flex shrink-0 items-center gap-3 pb-4">
            {onBack !== undefined && (
              <Button
                variant="glass"
                size="sm"
                icon="arrow-left"
                aria-label={t("onboarding.intro.back")}
                onClick={onBack}
                className="size-10 shrink-0 px-0"
              />
            )}
            <h1 className="font-display text-display-2 tracking-display text-strong">
              {t("settings.class")}
            </h1>
          </header>
        ) : (
          <header className="flex shrink-0 flex-col pb-4">
            <div className="flex h-9 items-center justify-between gap-3">
              <span
                role="img"
                aria-label={t("app.title")}
                className="size-8 shrink-0 bg-strong"
                style={{
                  maskImage: "url(/mark.svg)",
                  WebkitMaskImage: "url(/mark.svg)",
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                }}
              />
              {onBack !== undefined && (
                <Button variant="glass" size="sm" icon="arrow-left" onClick={onBack}>
                  {t("onboarding.intro.back")}
                </Button>
              )}
            </div>

            <h1 className="mt-4 font-display text-display-2 tracking-display text-balance text-strong">
              {t("onboarding.title")}
            </h1>
            <p className="mt-1.5 font-text text-body text-muted">{t("onboarding.subtitle")}</p>
          </header>
        )}

        {classes.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center pb-12">
            <StateMessage icon="cloud" title={t("class.loading")} />
          </div>
        ) : (
          <>
            <ClassSearch
              value={query}
              onChange={setQuery}
              years={years}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
              buildings={buildings}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={setSelectedBuilding}
            />

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-28">
              <ClassList
                classes={matches}
                favorites={favorites}
                selected={draftId}
                onSelect={(cls) => {
                  setDraftId(cls.id);
                }}
                onToggleFavorite={(id) => {
                  void toggleFavorite(id);
                }}
              />
            </div>

            {/* Soft fade-up footer anchored to the bottom, matching OnboardingLanguage's CTA rhythm. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-app via-app/95 to-transparent px-gutter pt-8 pb-[calc(--spacing(5)+var(--app-inset-bottom))] tablet:pb-8">
              <div className="pointer-events-auto mx-auto w-full max-w-screen tablet:max-w-[640px]">
                <Button
                  block
                  size="lg"
                  iconEnd="arrow-right"
                  disabled={draftClass === null}
                  onClick={confirm}
                >
                  {draftClass === null
                    ? t("general.continue")
                    : `${t("general.continue")} · ${draftClass.short}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
