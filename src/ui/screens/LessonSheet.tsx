import type { ResolvedDay, ResolvedLesson } from "../../lib/edupage/index.ts";
import { Card } from "../../ds/index.ts";
import { Sheet } from "../components/Sheet.tsx";
import { StatusBadge } from "../components/Badge.tsx";
import { formatRange, useT } from "../i18n/index.ts";

const Field = ({ label, value }: { label: string; value: string }) => {
  if (value === "") return null;
  return (
    <div className="flex justify-between gap-4 border-t border-hairline py-2.5 first:border-t-0">
      <dt className="font-text text-caption text-muted">{label}</dt>
      <dd className="text-right font-text text-caption font-bold text-strong">{value}</dd>
    </div>
  );
};

/**
 * Lesson detail. Its job is the diff: what the base timetable said versus what the school
 * changed. `changeNote` is EduPage's own Latvian sentence — shown verbatim under a
 * "from school" label, never translated (CLAUDE.md).
 */
export const LessonSheet = ({
  lesson,
  day,
  onClose,
}: {
  lesson: ResolvedLesson | null;
  day: ResolvedDay | null;
  onClose: () => void;
}) => {
  const t = useT();
  const open = lesson !== null;
  const title = lesson?.subject?.name ?? lesson?.subject?.short ?? "";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title === "" ? "—" : title}
      eyebrow={lesson === null ? undefined : formatRange(lesson.start, lesson.end)}
    >
      {lesson !== null && (
        <div className="pb-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={lesson.status} />
          </div>

          <dl className="flex flex-col">
            <Field label={t("lesson.period")} value={lesson.period} />
            <Field
              label={t("lesson.teacher")}
              value={lesson.teachers.map((x) => x.short).join(", ")}
            />
            <Field label={t("lesson.room")} value={lesson.rooms.map((x) => x.short).join(", ")} />
            <Field label={t("lesson.group")} value={lesson.group ?? ""} />
            <Field label={t("lesson.building")} value={day?.building ?? ""} />

            {lesson.original != null && (
              <>
                <Field
                  label={`${t("lesson.was")} · ${t("lesson.teacher")}`}
                  value={(lesson.original.teachers ?? []).map((x) => x.short).join(", ")}
                />
                <Field
                  label={`${t("lesson.was")} · ${t("lesson.room")}`}
                  value={(lesson.original.rooms ?? []).map((x) => x.short).join(", ")}
                />
                <Field
                  label={`${t("lesson.was")} · ${t("lesson.period")}`}
                  value={lesson.original.period ?? ""}
                />
              </>
            )}
          </dl>

          {lesson.changeNote !== null && (
            <Card tone="sunken" radius="lg" elevation="none" className="mt-4">
              <p className="u-eyebrow">{t("lesson.fromSchool")}</p>
              <p className="mt-1 font-text text-body text-fg">{lesson.changeNote}</p>
            </Card>
          )}
        </div>
      )}
    </Sheet>
  );
};
