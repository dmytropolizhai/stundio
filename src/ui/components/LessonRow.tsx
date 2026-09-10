import { motion } from "framer-motion";
import type { ResolvedLesson } from "../../lib/edupage/index.ts";
import { subjectColor } from "../theme/index.ts";
import { useT } from "../i18n/index.ts";
import { StatusBadge } from "./Badge.tsx";

/**
 * One lesson in the day list.
 *
 * A cancelled lesson stays on screen, struck through (CLAUDE.md) — hiding it would leave the
 * user wondering whether the app lost the lesson or the school did.
 */
export const LessonRow = ({
  lesson,
  live,
  progress,
  onOpen,
}: {
  lesson: ResolvedLesson;
  live: boolean;
  /** 0–1 through the lesson; only passed when `live`. */
  progress?: number;
  onOpen: () => void;
}) => {
  const t = useT();
  const cancelled = lesson.status === "cancelled";
  const teachers = lesson.teachers.map((x) => x.short).join(", ");
  const rooms = lesson.rooms.map((x) => x.short).join(", ");

  return (
    <motion.li layout="position" initial={false}>
      <button
        type="button"
        onClick={onOpen}
        className={`relative flex w-full gap-3 overflow-hidden rounded-xl border p-3 text-left transition-colors ${
          live
            ? "border-accent-400 bg-accent-50 dark:border-accent-500 dark:bg-accent-500/10"
            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        }`}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: subjectColor(lesson.subject) }}
        />

        <span className="w-14 shrink-0 pl-2 text-sm tabular-nums text-slate-500 dark:text-slate-400">
          <span className="block font-medium text-slate-700 dark:text-slate-200">
            {lesson.start}
          </span>
          {lesson.end}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={`truncate font-medium ${
                cancelled
                  ? "text-slate-400 line-through dark:text-slate-500"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {lesson.subject?.name ?? lesson.subject?.short ?? "—"}
            </span>
            <StatusBadge status={lesson.status} />
          </span>

          <span className="mt-0.5 block truncate text-sm text-slate-500 dark:text-slate-400">
            {[teachers, rooms, lesson.group === null ? "" : `${t("lesson.group")} ${lesson.group}`]
              .filter((x) => x !== "")
              .join(" · ")}
          </span>
        </span>

        <span className="self-center text-xs tabular-nums text-slate-400">{lesson.period}</span>

        {live && progress !== undefined && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-0.5 bg-accent-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        )}
      </button>
    </motion.li>
  );
};
