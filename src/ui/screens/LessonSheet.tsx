import type { ResolvedDay, ResolvedLesson } from "../../lib/edupage/index.ts";
import { Sheet } from "../components/Sheet.tsx";
import { StatusBadge } from "../components/Badge.tsx";
import { subjectColor } from "../theme/index.ts";
import { formatRange, useT } from "../i18n/index.ts";

const Field = ({ label, value }: { label: string; value: string }) => {
  if (value === "") return null;
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900 dark:text-slate-100">{value}</dd>
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
    <Sheet open={open} onClose={onClose} title={title}>
      {lesson !== null && (
        <div className="px-5 pt-4 pb-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-1.5 h-8 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: subjectColor(lesson.subject) }}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title === "" ? "—" : title}
              </h2>
              <p className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                {formatRange(lesson.start, lesson.end)}
              </p>
            </div>
            <StatusBadge status={lesson.status} />
          </div>

          <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
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
            <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                {t("lesson.fromSchool")}
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{lesson.changeNote}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-slate-100 py-3 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {t("lesson.close")}
          </button>
        </div>
      )}
    </Sheet>
  );
};
