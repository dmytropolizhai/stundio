/**
 * The two-second answer, above the lesson list: the lesson to look at right now (or the one
 * about to start), how long until it matters, and — when the next lesson is in another
 * building — the walk. The list below stays the full day; this only lifts the one row the
 * student is actually asking about (PRODUCT.md, "the glance is the product").
 */
import type { DayGlance as Glance } from "@/lib/schedule";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { Card, Icon } from "@/ds";
import { lessonBuilding } from "@/ui/theme";
import { formatDuration, useT } from "@/ui/i18n";
import { glanceWalk } from "./glance-walk.ts";
import { lessonHeading } from "@/ui/components/lesson-heading.ts";

type DayGlanceProps = {
  day: ResolvedDay;
  glance: Exclude<Glance, { kind: "finished" }>;
  onOpenLesson: (lesson: ResolvedLesson) => void;
};

export const DayGlance = ({ day, glance, onOpenLesson }: DayGlanceProps) => {
  const t = useT();
  const { lesson } = glance;
  const { isTeacherMode, rooms, title, subtitle } = lessonHeading(lesson);
  const building = lessonBuilding(day, lesson);
  const live = glance.kind === "live";

  const eyebrow = live ? t("day.now") : t("day.glance.following");
  const countdown = live
    ? t("day.glance.left", { duration: formatDuration(glance.minutesLeft) })
    : t("day.glance.in", { duration: formatDuration(glance.minutesUntil) });

  const walkTo = glanceWalk(glance);
  const walkBuilding = walkTo === null ? undefined : lessonBuilding(day, walkTo.to);

  return (
    <Card
      tone={live ? "brand" : "surface"}
      radius="xl"
      className="mt-3"
      data-testid="day-glance"
      aria-label={t("day.glance.open", { title, countdown })}
      onClick={() => {
        onOpenLesson(lesson);
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={live ? "u-eyebrow opacity-80" : "u-eyebrow"}
          style={live ? { color: "inherit" } : undefined}
        >
          {eyebrow}
        </span>
        <span
          className="font-data text-caption font-bold tabular-nums"
          data-testid="glance-countdown"
        >
          {countdown}
        </span>
      </div>

      {/* The global h2 colour is text-strong, which is near-black on the brand card. */}
      <h2 className="mt-1 font-display text-display-2 tracking-display text-current">{title}</h2>
      {subtitle !== undefined && <p className="font-text text-caption opacity-80">{subtitle}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-text text-body font-bold">
        {!isTeacherMode && rooms !== "" && (
          <span className="flex items-center gap-1.5" data-testid="glance-room">
            <Icon name="map-pin" size={16} className="shrink-0" />
            {rooms}
          </span>
        )}
        {building !== undefined && (
          <span className="flex items-center gap-1.5" data-testid="glance-building">
            <Icon name="building-2" size={16} className="shrink-0" />
            {building}
          </span>
        )}
      </div>

      {live && (
        <span
          aria-hidden="true"
          className="mt-3 block h-1 overflow-hidden rounded-pill bg-on-brand/25"
        >
          <span
            className="block h-full rounded-pill bg-on-brand"
            style={{ width: `${String(Math.round(glance.progress * 100))}%` }}
          />
        </span>
      )}

      {live && glance.following !== null && (
        <p className="mt-3 font-text text-caption opacity-90" data-testid="glance-following">
          {t("day.glance.following")}: {lessonHeading(glance.following).title}
        </p>
      )}

      {walkTo !== null && walkBuilding !== undefined && (
        <p
          className="mt-3 flex items-center gap-2 font-text text-caption font-bold"
          data-testid="glance-walk"
        >
          <Icon name="triangle-alert" size={16} className="shrink-0" />
          {walkTo.from === null
            ? t("day.glance.walk", { building: walkBuilding })
            : t("day.glance.walkFrom", { from: walkTo.from, building: walkBuilding })}
        </p>
      )}
    </Card>
  );
};
