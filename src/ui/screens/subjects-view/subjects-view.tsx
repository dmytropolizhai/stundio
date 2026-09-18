import { useState } from "react";
import { useAppStore } from "@/store";
import { TopBar } from "@/ds";
import { subjectAccent } from "@/ui/theme";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { DaySkeleton } from "@/ui/components/Skeleton.tsx";
import { useSubjects } from "@/ui/hooks/useSubjects.ts";
import { SubjectNoteSheet } from "@/ui/screens/sheets/SubjectNoteSheet.tsx";
import { useT } from "@/ui/i18n";
import type { SubjectRef } from "@/lib/edupage";
import { SubjectCard } from "./subject-card.tsx";
import { TeacherList } from "./teacher-list.tsx";

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
              <SubjectCard
                key={subject.id}
                subject={subject}
                count={count}
                taughtBy={taughtBy}
                hasNote={hasNote}
                accent={accent}
                onSelect={() => {
                  setOpenSubject(subject);
                }}
              />
            );
          })}
        </div>

        <TeacherList teachers={teachers} />
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
