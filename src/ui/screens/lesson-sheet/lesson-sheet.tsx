import type { CSSProperties } from "react";
import type { ResolvedDay, ResolvedLesson, TeacherResolvedLesson } from "@/lib/edupage";
import { Badge, BottomSheet, Button, Icon, cn, type LessonTone } from "@/ds";
import { useAppStore } from "@/store";
import { lessonAccent, type SubjectAccent } from "@/ui/theme";
import { StatusBadge } from "@/ui/components/Badge.tsx";
import { lessonHeading } from "@/ui/components/lesson-heading.ts";
import { formatRange, formatShortDate, useLang, useT } from "@/ui/i18n";
import { LessonField } from "./lesson-field.tsx";

const ORB_TONE: Record<Exclude<LessonTone, "custom">, string> = {
  amber: "bg-amber text-amber-ink",
  sky: "bg-sky text-sky-ink",
  lilac: "bg-lilac text-lilac-ink",
  pink: "bg-pink text-pink-ink",
  mint: "bg-mint text-mint-ink",
  lime: "bg-lime text-lime-ink",
  brand: "bg-brand text-on-brand",
};

const accentVar = (accent: SubjectAccent): string =>
  accent.tone === "custom" ? accent.fill : `var(--accent-${accent.tone})`;

type LessonSheetProps = {
  lesson: ResolvedLesson | null;
  day: ResolvedDay | null;
  onClose: () => void;
};

/**
 * Lesson detail sheet. Matches the Home screen's liquid-glass Night / Day grammar: frosted glass
 * shell with a subject-toned caustic wash behind the period jewel, a recessed `.u-sheet-slab`
 * fact list with inline substitution diffs, and verbatim school notes (`changeNote` / `noteRefs`)
 * under a "from school" label — never translated (AGENT.md).
 */
export const LessonSheet = ({ lesson, day, onClose }: LessonSheetProps) => {
  const t = useT();
  const lang = useLang();
  const subjectColorOverrides = useAppStore((s) => s.settings.subjectColorOverrides);
  const groupColorOverrides = useAppStore((s) => s.settings.groupColorOverrides);
  const colorCodingEnabled = useAppStore((s) => s.settings.subjectColorCodingEnabled);

  const open = lesson !== null;
  const heading = lesson === null ? null : lessonHeading(lesson, false);
  const title = heading?.title ?? "—";
  const origSubject = heading?.originalSubjectName ?? "";
  const isTeacherMode = heading?.isTeacherMode ?? false;
  const teacherLesson = lesson as Partial<TeacherResolvedLesson> | null;
  const isCover = lesson?.isCover === true || teacherLesson?.role === "cover";
  const coverForName = teacherLesson?.coverFor?.name ?? teacherLesson?.coverFor?.short ?? "";
  const cancelled = lesson?.status === "cancelled";

  const teachersValue = (lesson?.teachers ?? []).map((x) => x.name || x.short).join(", ");
  const origTeachers = (lesson?.original?.teachers ?? []).map((x) => x.name || x.short).join(", ");
  const origRooms = (lesson?.original?.rooms ?? []).map((x) => x.short).join(", ");
  const periodChanged =
    lesson !== null &&
    lesson.original?.period !== undefined &&
    lesson.original.period !== "" &&
    lesson.original.period !== lesson.period;

  const accent =
    lesson === null
      ? null
      : lessonAccent(lesson, subjectColorOverrides, groupColorOverrides, colorCodingEnabled);

  const sheetStyle =
    accent === null ? undefined : ({ "--row-tone": accentVar(accent) } as CSSProperties);

  const timeRange = lesson === null ? "" : formatRange(lesson.start, lesson.end);
  const dateLabel = day === null ? "" : formatShortDate(day.date, lang);
  const movedToValue =
    lesson?.movedTo === undefined
      ? ""
      : lesson.movedTo.period !== undefined
        ? `${formatShortDate(lesson.movedTo.date, lang)} · ${lesson.movedTo.period}.`
        : formatShortDate(lesson.movedTo.date, lang);

  const periodJewel =
    lesson !== null && accent !== null ? (
      <div className="relative flex items-center justify-center">
        {!cancelled && (
          <span
            aria-hidden="true"
            className="u-schedule-orb-halo pointer-events-none absolute -inset-2.5 rounded-full opacity-70"
          />
        )}
        <span
          data-testid="lesson-sheet-period-jewel"
          className={cn(
            "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full font-data text-body font-bold tabular-nums",
            "shadow-[inset_0_1px_1px_rgba(255,255,255,0.48),0_1px_2px_rgba(18,20,25,0.1)]",
            accent.tone === "custom" ? "" : ORB_TONE[accent.tone],
            cancelled && "opacity-55",
          )}
          style={
            accent.tone === "custom"
              ? { backgroundColor: accent.fill, color: accent.ink }
              : undefined
          }
        >
          {lesson.period}
        </span>
      </div>
    ) : undefined;

  const schoolNotes: string[] = [];
  if (lesson !== null) {
    if (lesson.changeNote !== null) {
      schoolNotes.push(lesson.changeNote);
    }
    if (lesson.noteRefs !== undefined) {
      for (const ref of lesson.noteRefs) {
        if (!schoolNotes.includes(ref)) {
          schoolNotes.push(ref);
        }
      }
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      closeLabel={t("lesson.close")}
      className={cn("u-sheet-glass", !cancelled && accent !== null && "u-sheet-glass-caustic")}
      titleClassName="text-title leading-snug"
      style={sheetStyle}
      leading={periodJewel}
      label={title}
      title={<span className={cancelled ? "line-through opacity-70" : undefined}>{title}</span>}
      subtitle={
        lesson !== null ? (
          <div className="flex flex-col gap-1.5">
            {heading?.subtitle !== undefined && heading.subtitle !== title && (
              <span data-testid="lesson-sheet-subject" className="font-medium text-fg">
                {heading.subtitle}
              </span>
            )}
            {origSubject !== "" && origSubject !== title && (
              <span data-testid="lesson-original-subject" className="line-through opacity-75">
                {origSubject}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {dateLabel !== "" && (
                <span
                  data-testid="lesson-sheet-date"
                  className="u-schedule-glass-chip inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-text text-caption leading-none font-medium text-strong"
                >
                  <Icon name="calendar-days" size={12} className="text-muted" />
                  {dateLabel}
                </span>
              )}
              {timeRange !== "" && (
                <span
                  data-testid="lesson-sheet-time"
                  className={cn(
                    "u-schedule-glass-chip inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-data text-caption leading-none font-medium tabular-nums text-strong",
                    cancelled && "opacity-65 line-through",
                  )}
                >
                  <Icon name="clock" size={12} className="text-muted" />
                  {timeRange}
                </span>
              )}
              <StatusBadge status={lesson.status} />
              {isCover && (
                <Badge tone="warning" uppercase={false} data-testid="lesson-sheet-cover">
                  {t("teacher.cover")}
                </Badge>
              )}
            </div>
          </div>
        ) : undefined
      }
      footer={
        lesson === null ? undefined : (
          <Button variant="inverse" block onClick={onClose}>
            {t("lesson.close")}
          </Button>
        )
      }
    >
      {lesson !== null && (
        <div className="pb-1">
          <dl
            data-testid="lesson-details-slab"
            className="u-sheet-slab divide-y divide-(--schedule-divider) overflow-hidden rounded-xl"
          >
            {periodChanged && (
              <LessonField
                icon="layers"
                label={t("lesson.period")}
                value={lesson.period}
                was={lesson.original?.period}
                wasLabel={t("lesson.was")}
                mono
              />
            )}
            {movedToValue !== "" && (
              <LessonField icon="calendar-days" label={t("status.moved")} value={movedToValue} />
            )}
            {isTeacherMode && heading?.classNames && heading.classNames !== title && (
              <LessonField icon="users" label={t("settings.class")} value={heading.classNames} />
            )}
            {!isTeacherMode && (
              <LessonField
                icon="user-round"
                label={t("lesson.teacher")}
                value={teachersValue}
                was={origTeachers}
                wasLabel={t("lesson.was")}
              />
            )}
            <LessonField
              icon="map-pin"
              label={t("lesson.room")}
              value={lesson.rooms.map((x) => x.short).join(", ")}
              was={origRooms}
              wasLabel={t("lesson.was")}
              mono
              capsule={!cancelled}
            />
            {isCover && coverForName !== "" && (
              <LessonField icon="repeat" label={t("teacher.cover")} value={coverForName} />
            )}
            {!isTeacherMode && (
              <LessonField icon="users" label={t("lesson.group")} value={lesson.group ?? ""} />
            )}
            <LessonField
              icon="building-2"
              label={t("lesson.building")}
              value={lesson.building ?? day?.building ?? ""}
            />
          </dl>

          {schoolNotes.length > 0 && (
            <div
              data-testid="lesson-school-notes"
              className="u-sheet-slab mt-3 rounded-xl px-4 py-3.5"
            >
              <div className="flex items-center gap-1.5 text-muted">
                <Icon name="megaphone" size={14} className="shrink-0" />
                <p className="font-text text-caption font-semibold tracking-normal text-muted">
                  {t("lesson.fromSchool")}
                </p>
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {schoolNotes.map((note) => (
                  <p key={note} className="font-text text-body text-fg">
                    {note}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
};
