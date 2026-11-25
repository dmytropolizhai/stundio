/**
 * The two-second answer, above the lesson list: the lesson to look at right now (or the one
 * about to start), how long until it matters, and — when the next lesson is in another
 * building — the walk. The list below stays the full day; this only lifts the one row the
 * student is actually asking about (PRODUCT.md, "the glance is the product").
 */
import type { DayGlance as Glance } from "@/lib/schedule";
import type { ResolvedDay, ResolvedLesson } from "@/lib/edupage";
import { Badge, Card, Icon } from "@/ds";
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
      tone={live ? "panel" : "surface"}
      radius="2xl"
      elevation={live ? "raised" : "card"}
      className={live ? "mt-3 p-5 shadow-brand" : "mt-3 p-5"}
      data-testid="day-glance"
      aria-label={t("day.glance.open", { title, countdown })}
      onClick={() => {
        onOpenLesson(lesson);
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        {live ? (
          <Badge tone="lamp" uppercase={false}>
            {eyebrow}
          </Badge>
        ) : (
          <span className="u-eyebrow">{eyebrow}</span>
        )}
        <span
          className={
            live
              ? "font-data text-title font-semibold tabular-nums text-lamp-text"
              : "font-data text-body font-medium tabular-nums"
          }
          data-testid="glance-countdown"
        >
          {countdown}
        </span>
      </div>

      <h2 className="mt-3 font-display text-display-2 font-semibold tracking-display text-strong">
        {title}
      </h2>
      {subtitle !== undefined && <p className="font-text text-caption text-muted">{subtitle}</p>}

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
        <span aria-hidden="true" className="mt-4 block h-1 overflow-hidden rounded-pill bg-sunken">
          <span
            className="block h-full rounded-pill bg-lamp-mark"
            style={{ width: `${String(Math.round(glance.progress * 100))}%` }}
          />
        </span>
      )}

      {live && glance.following !== null && (
        <p className="mt-3 font-text text-caption text-muted" data-testid="glance-following">
          {t("day.glance.following")}: {lessonHeading(glance.following).title}
        </p>
      )}

      {walkTo !== null && walkBuilding !== undefined && (
        <p
          className="mt-3 flex items-center gap-2 font-text text-caption font-medium text-caution"
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
