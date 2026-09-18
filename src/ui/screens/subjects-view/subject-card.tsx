import { Card } from "@/ds";
import type { SubjectRef, TeacherRef } from "@/lib/edupage";
import type { SubjectAccent } from "@/ui/theme";
import { subjectCode } from "@/ui/theme";
import { useT } from "@/ui/i18n";

type SubjectCardProps = {
  subject: SubjectRef;
  count: number;
  taughtBy: TeacherRef[];
  hasNote: boolean;
  accent: SubjectAccent;
  onSelect: () => void;
};

export const SubjectCard = ({
  subject,
  count,
  taughtBy,
  hasNote,
  accent,
  onSelect,
}: SubjectCardProps) => {
  const t = useT();
  const subjectKey = subject.name === "" ? subject.short : subject.name;

  return (
    <Card
      tone={accent.tone}
      style={
        accent.tone === "custom"
          ? { backgroundColor: accent.fill, color: accent.ink }
          : undefined
      }
      className="min-w-0 text-left"
      data-testid={`subject-${subject.id}`}
      onClick={onSelect}
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
};
