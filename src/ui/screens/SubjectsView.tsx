import { useState } from "react";
import { useAppStore } from "@/store";
import { Card, TopBar } from "@/ds";
import { subjectCode, subjectAccent } from "@/ui/theme";
import { StateMessage } from "../components/StateMessage.tsx";
import { DaySkeleton } from "../components/Skeleton.tsx";
import { useSubjects } from "../hooks/useSubjects.ts";
import { SubjectNoteSheet } from "./sheets/SubjectNoteSheet.tsx";
import { useT } from "@/ui/i18n";
import type { SubjectRef } from "@/lib/edupage";

/**
 * Everything the class is taught, and who teaches it.
 *
 * The one screen with no counterpart in the pre-design-system app — it comes from the DS UI kit,
 * and it is the payoff for assigning each subject a fixed accent: this is the legend for every
 * color the day and week views use.
 *
 * Derived entirely from the cached timetable, so it works offline like everything else. Subject
 * names are printed verbatim from EduPage, in Latvian, diacritics intact.
 */
export const SubjectsView = () => {
  const t = useT();
  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);
  const { subjects, teachers } = useSubjects();
  const notes = useAppStore((s) => s.notes);
  const [openSubject, setOpenSubject] = useState<SubjectRef | null>(null);

  const body = () => {
    if (!ready) return <DaySkeleton rows={4} />;
    if (selectedClassId === null) {
      return <StateMessage icon="graduation-cap" title={t("day.noClass")} />;
    }
    if (subjects.length === 0) {
      return (
        <StateMessage icon="cloud" title={t("subjects.empty")} hint={t("subjects.emptyHint")} />
      );
    }

    return (
      <>
        <div className="mb-7 grid grid-cols-2 gap-3">
          {subjects.map(({ subject, count, teachers: taughtBy }) => {
            const subjectKey = subject.name === "" ? subject.short : subject.name;
            const hasNote = (notes[subjectKey]?.text ?? "") !== "";
            const accent = subjectAccent(subject, subjectColorOverrides, colorCodingEnabled);
            return (
              <Card
                key={subject.id}
                tone={accent.tone}
                style={
                  accent.tone === "custom"
                    ? { backgroundColor: accent.fill, color: accent.ink }
                    : undefined
                }
                className="min-w-0 text-left"
                data-testid={`subject-${subject.id}`}
                onClick={() => {
                  setOpenSubject(subject);
                }}
              >
                <div className="flex items-center justify-between">
                  {/* The derived code, not `short` — RVT fills `short` with the full name. */}
                  <span className="font-text text-micro font-bold tracking-label uppercase opacity-75">
                    {subjectCode(subject)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {hasNote && (
                      <span
                        aria-label={t("subjects.note.badge")}
                        className="size-1.5 rounded-full bg-current opacity-75"
                      />
                    )}
                    <span className="font-data text-caption font-bold tabular-nums">
                      {t("subjects.perWeek", { n: count })}
                    </span>
                  </span>
                </div>
                <div className="mt-2.5 mb-1.5 font-display text-[26px] leading-[.95] font-black break-words">
                  {subjectKey}
                </div>
                <div className="font-text text-caption opacity-80">
                  {taughtBy.map((x) => x.short).join(", ")}
                </div>
              </Card>
            );
          })}
        </div>

        {teachers.length > 0 && (
          <>
            <h2 className="mb-3 font-display text-display-2 tracking-display text-strong">
              {t("subjects.teachers")}
            </h2>
            <Card radius="xl" className="p-0">
              {teachers.map(({ teacher, subjects: taught }, i) => (
                <div
                  key={teacher.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i === 0 ? "" : "border-t border-hairline"}`}
                >
                  <span className="inline-flex size-9.5 items-center justify-center rounded-squircle bg-brand-tint font-display text-[16px] font-black text-brand-strong">
                    {teacher.short.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-text text-body font-bold text-strong">{teacher.short}</div>
                    <div className="truncate font-text text-caption text-muted">
                      {taught.map((s) => s.name || s.short).join(" · ")}
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}
      </>
    );
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-nav-safe">
        <TopBar title={t("subjects.title")} />
        {body()}
      </div>
      <SubjectNoteSheet
        subject={openSubject}
        onClose={() => {
          setOpenSubject(null);
        }}
      />
    </div>
  );
};
