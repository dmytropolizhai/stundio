import { Card, Icon } from "@/ds";
import type { Substitution } from "@/lib/edupage";
import { StatusBadge } from "@/ui/components/Badge.tsx";
import { useT } from "@/ui/i18n";
import { PeriodRuns } from "./period-runs.tsx";
import { ARROW, substKindToStatus } from "./subst-status.ts";

type ChangesSubstCardProps = {
  item: Substitution;
};

/**
 * One raw substitution row, as published for any class. Unlike
 * `ChangesLessonCard` there is no resolved lesson behind it, so the card is not
 * clickable and the school's `raw` line renders verbatim.
 */
export const ChangesSubstCard = ({ item }: ChangesSubstCardProps) => {
  const t = useT();

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        {/* An empty span holds the badge to the right when no period was parsed. */}
        {item.periods.length > 0 ? (
          <PeriodRuns periods={item.periods} label={t("lesson.period")} />
        ) : (
          <span />
        )}
        <span className="shrink-0">
          <StatusBadge status={substKindToStatus(item.kind)} />
        </span>
      </div>

      {item.subject !== null && (
        <div className="font-display text-body font-black text-strong">
          {item.subjectFrom !== null ? (
            <>
              <span className="line-through opacity-70">{item.subjectFrom}</span> {ARROW}{" "}
              {item.subject}
            </>
          ) : (
            item.subject
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 font-text text-caption text-muted">
        {(item.teacher !== null || item.teacherFrom !== null) && (
          <div className="flex items-center gap-1.5">
            <Icon name="user-round" size={14} className="shrink-0" />
            <span>
              {item.teacherFrom !== null ? (
                <>
                  <span className="line-through opacity-70">{item.teacherFrom}</span>
                  {item.teacher !== null && (
                    <>
                      {" "}
                      {ARROW} <strong className="text-fg">{item.teacher}</strong>
                    </>
                  )}
                </>
              ) : (
                <strong className="text-fg">{item.teacher}</strong>
              )}
            </span>
          </div>
        )}

        {item.room !== null && (
          <div className="flex items-center gap-1.5">
            <Icon name="map-pin" size={14} className="shrink-0" />
            <span>
              {item.roomFrom !== null ? (
                <>
                  <span className="line-through opacity-70">{item.roomFrom}</span> {ARROW}{" "}
                  <strong className="text-fg">{item.room}</strong>
                </>
              ) : (
                <strong className="text-fg">{item.room}</strong>
              )}
            </span>
          </div>
        )}
      </div>

      {item.raw !== "" && (
        <div className="mt-1 rounded-lg bg-sunken p-4 font-text text-caption text-fg">
          <p className="u-eyebrow text-muted">{t("lesson.fromSchool")}</p>
          <p className="mt-0.5">{item.raw}</p>
        </div>
      )}
    </Card>
  );
};
