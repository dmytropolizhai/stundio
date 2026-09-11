import type { ResolvedDay } from "../../lib/edupage/index.ts";
import { dayProgress, glanceLesson, type RigaClock } from "../../lib/schedule/index.ts";
import { Icon, cn } from "../../ds/index.ts";
import { useT } from "../i18n/index.ts";

/**
 * The glance — the product's single stated job (PRODUCT.md: "what's on now / what's next" in a
 * two-second glance). `glanceLesson()` already computed this on every render and rendered
 * nowhere; this is the one place in the UI that shows it.
 *
 * Deliberately not the `LessonCard`: the glance answers one question ("what, where, how long")
 * rather than listing a lesson's full detail, so it earns its own small layout instead of
 * borrowing the list row's two-column time rail.
 */
export const GlanceCard = ({ day, now }: { day: ResolvedDay | null; now: RigaClock }) => {
  const t = useT();

  if (day === null || day.lessons.length === 0) return null;

  const progress = dayProgress(day, now);
  const glance = glanceLesson(day, now);

  if (glance === null) {
    if (!progress.finished) return null;
    return (
      <div
        className="mb-4 rounded-xl bg-card px-5 py-6 text-center shadow-card"
        data-testid="glance-card"
      >
        <p className="font-display text-display-2 tracking-display text-strong">
          {t("day.finished")}
        </p>
      </div>
    );
  }

  const { lesson, live, minutes } = glance;
  const room = lesson.rooms.map((x) => x.short).join(", ");
  const teacher = lesson.teachers.map((x) => x.short).join(", ");
  const minutesLabel =
    live || minutes > 0
      ? t(live ? "time.minutesLeft" : "time.inMinutes", { n: minutes })
      : t("time.startsNow");

  return (
    <div
      className={cn(
        "mb-4 flex items-center justify-between gap-4 rounded-xl bg-card p-5 shadow-card",
        live && "inset-ring-2 inset-ring-brand",
      )}
      data-testid="glance-card"
    >
      <div className="min-w-0">
        <p className="u-eyebrow text-brand-strong">{t(live ? "day.now" : "day.glanceNext")}</p>
        <h2 className="mt-1 truncate font-display text-title tracking-display text-strong">
          {lesson.subject?.name ?? lesson.subject?.short ?? "—"}
        </h2>
        {(room !== "" || teacher !== "") && (
          <div className="mt-1.5 flex flex-wrap gap-3.5 font-text text-caption text-muted">
            {room !== "" && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="map-pin" size={14} />
                {room}
              </span>
            )}
            {teacher !== "" && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="user-round" size={14} />
                {teacher}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="u-data shrink-0 text-body font-bold text-strong">{minutesLabel}</span>
    </div>
  );
};
