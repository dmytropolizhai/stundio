import { Button } from "@/ds";
import type { ResolvedLesson } from "@/lib/edupage";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { useT } from "@/ui/i18n";
import { ChangesLessonCard } from "./changes-lesson-card.tsx";
import { ChangesSchoolNotes } from "./changes-school-notes.tsx";

type ChangesMyClassProps = {
  changedLessons: readonly ResolvedLesson[];
  notes: readonly string[] | undefined;
  otherChangesCount: number;
  onOpenLesson: (lesson: ResolvedLesson) => void;
  onShowAllClasses: () => void;
};

export const ChangesMyClass = ({
  changedLessons,
  notes,
  otherChangesCount,
  onOpenLesson,
  onShowAllClasses,
}: ChangesMyClassProps) => {
  const t = useT();

  if (changedLessons.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center">
        <StateMessage
          icon="check"
          title={t("changes.emptyForClass")}
          hint={t("changes.emptyForClassHint")}
        />
        {otherChangesCount > 0 && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="font-text text-caption text-muted">
              {t("changes.otherGroupsHaveChanges", { n: otherChangesCount })}
            </p>
            <Button variant="outline" size="sm" onClick={onShowAllClasses}>
              {t("changes.viewOtherGroups")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {changedLessons.map((lesson) => (
        <ChangesLessonCard
          key={`${lesson.period}-${lesson.subject?.id ?? "x"}`}
          lesson={lesson}
          onOpen={onOpenLesson}
        />
      ))}

      <ChangesSchoolNotes notes={notes} className="mt-4" />
    </div>
  );
};
