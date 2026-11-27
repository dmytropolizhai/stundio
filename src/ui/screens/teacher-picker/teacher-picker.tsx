import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/ds";
import type { Building } from "@/lib/edupage";
import { useAppStore, useSettingSetter } from "@/store";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { useTeachers } from "@/ui/hooks/useTeachers.ts";
import { useT } from "@/ui/i18n";
import { TeacherList } from "./teacher-list.tsx";
import { TeacherSearch } from "./teacher-search.tsx";
import {
  availableTeacherBuildings,
  filterTeachers,
  hasFormTeachers,
  teacherDisplayName,
} from "./group-teachers.ts";

type TeacherPickerProps = {
  mode?: "onboarding" | "switch";
  onBack?: () => void;
  onPicked?: () => void;
};

/**
 * Night / Day liquid-glass teacher selector shared by first-run onboarding and the in-app
 * switcher. Mirrors `ClassSelector`: teachers narrow ~150 RVT staff with diacritic-tolerant live
 * search and Building / Form-teacher filter pills, highlight their name inside A–Z glass slabs,
 * and commit via the bottom Continue CTA.
 */
export const TeacherPicker = ({ mode = "onboarding", onBack, onPicked }: TeacherPickerProps) => {
  const t = useT();
  const teachers = useTeachers();
  const selected = useAppStore((s) => s.settings.selectedTeacherId);
  const setTeacher = useAppStore((s) => s.setTeacher);
  const setPersona = useSettingSetter("persona");
  const refresh = useAppStore((s) => s.refresh);

  const [query, setQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [formTeachersOnly, setFormTeachersOnly] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(selected);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (teachers.length === 0) {
      void refresh();
    }
  }, [teachers.length, refresh]);

  const buildings = useMemo(() => availableTeacherBuildings(teachers), [teachers]);
  const showFormTeacherFilter = useMemo(() => hasFormTeachers(teachers), [teachers]);

  const matches = useMemo(
    () => filterTeachers(teachers, query, selectedBuilding, formTeachersOnly),
    [teachers, query, selectedBuilding, formTeachersOnly],
  );

  const draftTeacher = useMemo(
    () => (draftId === null ? null : (teachers.find((item) => item.id === draftId) ?? null)),
    [teachers, draftId],
  );

  const confirm = () => {
    if (draftTeacher === null) return;
    void setPersona("teacher");
    void setTeacher(draftTeacher.id);
    onPicked?.();
  };

  const renderHeader = (withRef: boolean) =>
    mode === "switch" ? (
      <header
        ref={withRef ? headerRef : undefined}
        className="flex shrink-0 items-center gap-3 pt-4 pb-2 tablet:pt-8"
      >
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
          {t("onboarding.teacher.title")}
        </h1>
      </header>
    ) : (
      <header
        ref={withRef ? headerRef : undefined}
        className="flex shrink-0 flex-col pt-4 pb-2 tablet:pt-8"
      >
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
          {t("onboarding.teacher.title")}
        </h1>
        <p className="mt-1.5 font-text text-body text-muted">{t("onboarding.teacher.subtitle")}</p>
      </header>
    );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-app">
      {/* Soft top ambient lamp glow matching ClassSelector, OnboardingIntro, and OnboardingLanguage. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[48%]"
        style={{
          background:
            "radial-gradient(68% 62% at 50% 24%, color-mix(in oklab, var(--lamp) 16%, transparent) 0%, transparent 74%)",
        }}
      />

      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col pt-[var(--app-inset-top)]">
        {teachers.length === 0 ? (
          <div className="mx-auto flex min-h-0 w-full max-w-screen flex-1 flex-col px-gutter tablet:max-w-[640px]">
            {renderHeader(false)}

            <div className="flex min-h-0 flex-1 items-center justify-center pb-12">
              <StateMessage icon="cloud" title={t("teacher.loading")} />
            </div>
          </div>
        ) : (
          <>
            {/*
             * Full-bleed scroll container so the sticky search & filter bar docks flush to the
             * top and spans the full viewport width without hard side/top seams.
             */}
            <div
              className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-28"
              onScroll={(e) => {
                const headerHeight = headerRef.current?.offsetHeight ?? 0;
                const threshold = Math.max(4, headerHeight - 4);
                const next = e.currentTarget.scrollTop > threshold;
                if (next !== scrolled) setScrolled(next);
              }}
            >
              <div className="mx-auto w-full max-w-screen px-gutter tablet:max-w-[640px]">
                {renderHeader(true)}
              </div>

              <TeacherSearch
                value={query}
                onChange={setQuery}
                buildings={buildings}
                selectedBuilding={selectedBuilding}
                onSelectBuilding={setSelectedBuilding}
                showFormTeacherFilter={showFormTeacherFilter}
                formTeachersOnly={formTeachersOnly}
                onToggleFormTeachersOnly={() => {
                  setFormTeachersOnly((prev) => !prev);
                }}
                scrolled={scrolled}
              />

              <div className="mx-auto w-full max-w-screen px-gutter tablet:max-w-[640px]">
                <TeacherList
                  teachers={matches}
                  selected={draftId}
                  onSelect={(teacher) => {
                    setDraftId(teacher.id);
                  }}
                />
              </div>
            </div>

            {/* Soft fade-up footer anchored to the bottom, matching ClassSelector's CTA rhythm. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-app via-app/95 to-transparent px-gutter pt-8 pb-[calc(--spacing(5)+var(--app-inset-bottom))] tablet:pb-8">
              <div className="pointer-events-auto mx-auto w-full max-w-screen tablet:max-w-[640px]">
                <Button
                  block
                  size="lg"
                  iconEnd="arrow-right"
                  disabled={draftTeacher === null}
                  onClick={confirm}
                >
                  {draftTeacher === null
                    ? t("general.continue")
                    : `${t("general.continue")} · ${teacherDisplayName(draftTeacher)}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
