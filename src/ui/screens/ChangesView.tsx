import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { useAppStore } from "@/store";
import { addDays } from "@/sync";
import type {
  ISODate,
  ResolvedLesson,
  ResolvedStatus,
  SubstKind,
  Substitution,
} from "@/lib/edupage";
import { Badge, Button, Card, Icon, IconButton, TopBar, SegmentedTabs, TextField } from "@/ds";
import { PullToRefresh } from "../components/PullToRefresh.tsx";
import { StateMessage } from "../components/StateMessage.tsx";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { ClassBadge } from "../components/ClassBadge.tsx";
import { StatusBadge } from "../components/Badge.tsx";
import { DatePicker } from "../components/DatePicker.tsx";
import { LessonSheet } from "./lesson-sheet";
import { useNow } from "../hooks/useNow.ts";
import { formatRange, useT } from "@/ui/i18n";

const SWIPE_THRESHOLD_PX = 56;
const ARROW = "\u2794";

const substKindToStatus = (kind: SubstKind): ResolvedStatus => {
  switch (kind) {
    case "cancelled":
      return "cancelled";
    case "moved_in":
    case "moved_out":
      return "moved";
    case "substitution":
      return "substituted";
    case "room_change":
      return "room_change";
    case "added":
      return "added";
    default:
      return "substituted";
  }
};

type ChangesScope = "myClass" | "all";

export const ChangesView = ({
  date,
  onDateChange,
  onPickClass,
}: {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  onPickClass: () => void;
}) => {
  const t = useT();
  const now = useNow();

  const [scope, setScope] = useState<ChangesScope>("myClass");
  const [search, setSearch] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [openLesson, setOpenLesson] = useState<ResolvedLesson | null>(null);

  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const selectedClassShort = useAppStore((s) => s.selectedClassShort());
  const syncStatus = useAppStore((s) => s.syncStatus);
  const refresh = useAppStore((s) => s.refresh);
  const substitutions = useAppStore((s) => s.substitutions);

  const day = useAppStore((s) => s.resolvedDay(date));
  const daySubst = substitutions[date];

  const isToday = date === now.date;

  const changedLessons = useMemo(
    () => day?.lessons.filter((l) => l.status !== "normal") ?? [],
    [day],
  );

  const allSubstItems = useMemo(() => daySubst?.items ?? [], [daySubst]);

  const otherChangesCount = useMemo(() => {
    if (selectedClassShort === null) return allSubstItems.length;
    return allSubstItems.filter((it) => it.className !== selectedClassShort).length;
  }, [allSubstItems, selectedClassShort]);

  // Group items by class for "all" scope
  const groupedAllItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = allSubstItems.filter((item) => {
      if (query === "") return true;
      return (
        item.className.toLowerCase().includes(query) ||
        (item.subject?.toLowerCase().includes(query) ?? false) ||
        (item.subjectFrom?.toLowerCase().includes(query) ?? false) ||
        (item.teacher?.toLowerCase().includes(query) ?? false) ||
        (item.teacherFrom?.toLowerCase().includes(query) ?? false) ||
        (item.room?.toLowerCase().includes(query) ?? false) ||
        item.raw.toLowerCase().includes(query)
      );
    });

    const groups = new Map<string, Substitution[]>();
    for (const item of filtered) {
      const list = groups.get(item.className) ?? [];
      list.push(item);
      groups.set(item.className, list);
    }

    // Sort classes alphabetically, but put the user's class first
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (selectedClassShort !== null) {
        if (a === selectedClassShort) return -1;
        if (b === selectedClassShort) return 1;
      }
      return a.localeCompare(b);
    });
  }, [allSubstItems, search, selectedClassShort]);

  const reduceMotion = useReducedMotion() ?? false;
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const enterDir = useRef<1 | -1>(1);
  const x = useMotionValue(0);

  useEffect(() => {
    x.set(reduceMotion ? 0 : enterDir.current * 16);

    const controls = animate(x, 0, {
      duration: reduceMotion ? 0.001 : 0.24,
      ease: [0.2, 0.8, 0.2, 1],
    });

    return () => controls.stop();
  }, [date, reduceMotion, x]);

  const onSwipeStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch === undefined) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onSwipeMove = (e: React.TouchEvent) => {
    const start = touchStart.current;
    const touch = e.touches[0];
    if (start === null || touch === undefined) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx)) return;
    x.set(dx);
  };

  const onSwipeEnd = () => {
    const started = touchStart.current !== null;
    touchStart.current = null;
    const dx = x.get();

    if (started && dx <= -SWIPE_THRESHOLD_PX) {
      enterDir.current = 1;
      x.set(0);
      onDateChange(addDays(date, 1));
      return;
    }

    if (started && dx >= SWIPE_THRESHOLD_PX) {
      enterDir.current = -1;
      x.set(0);
      onDateChange(addDays(date, -1));
      return;
    }

    animate(x, 0, {
      duration: reduceMotion ? 0.001 : 0.2,
      ease: [0.2, 0.8, 0.2, 1],
    });
  };

  const renderMyClassView = (): ReactNode => {
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
              <Button variant="outline" size="sm" onClick={() => setScope("all")}>
                {t("changes.viewOtherGroups")}
              </Button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mt-4 flex flex-col gap-3">
        {changedLessons.map((lesson) => {
          const teacher = lesson.teachers.map((tItem) => tItem.short).join(", ");
          const origTeacher =
            lesson.original?.teachers?.map((tItem) => tItem.short).join(", ") ?? "";
          const room = lesson.rooms.map((r) => r.short).join(", ");
          const origRoom = lesson.original?.rooms?.map((r) => r.short).join(", ") ?? "";

          return (
            <Card
              key={`${lesson.period}-${lesson.subject?.id ?? "x"}`}
              className="flex flex-col gap-2.5 cursor-pointer text-left"
              data-testid={`change-lesson-${lesson.period}`}
              onClick={() => setOpenLesson(lesson)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-data text-caption font-bold text-strong">
                    #{lesson.period}
                  </span>
                  <span className="font-text text-caption text-muted">
                    {formatRange(lesson.start, lesson.end)}
                  </span>
                </div>
                <StatusBadge status={lesson.status} />
              </div>

              <div className="font-display text-title font-black text-strong leading-snug">
                {lesson.subject?.name ?? lesson.subject?.short ?? "—"}
              </div>

              <div className="flex flex-col gap-1 font-text text-caption text-muted">
                {teacher !== "" && (
                  <div className="flex items-center gap-1.5">
                    <Icon name="user-round" size={14} className="shrink-0" />
                    <span>
                      {origTeacher !== "" && origTeacher !== teacher ? (
                        <>
                          <span className="line-through opacity-70">{origTeacher}</span>
                          <span className="mx-1">➔</span>
                          <strong className="text-fg">{teacher}</strong>
                        </>
                      ) : (
                        <span className="text-fg">{teacher}</span>
                      )}
                    </span>
                  </div>
                )}

                {room !== "" && (
                  <div className="flex items-center gap-1.5">
                    <Icon name="map-pin" size={14} className="shrink-0" />
                    <span>
                      {origRoom !== "" && origRoom !== room ? (
                        <>
                          <span className="line-through opacity-70">{origRoom}</span>
                          <span className="mx-1">➔</span>
                          <strong className="text-fg">{room}</strong>
                        </>
                      ) : (
                        <span className="text-fg">{room}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {lesson.changeNote !== null && (
                <div className="mt-1 rounded-lg bg-sunken p-2 font-text text-caption text-fg">
                  <p className="u-eyebrow text-muted">{t("lesson.fromSchool")}</p>
                  <p className="mt-0.5">{lesson.changeNote}</p>
                </div>
              )}
            </Card>
          );
        })}

        {day?.notes && day.notes.length > 0 && (
          <Card tone="sunken" radius="lg" elevation="none" className="mt-4">
            <h3 className="u-eyebrow mb-1.5">{t("changes.notesFromSchool")}</h3>
            <ul className="flex flex-col gap-1 font-text text-caption text-fg">
              {day.notes.map((note, idx) => (
                <li key={idx}>• {note}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  };

  const renderAllClassesView = (): ReactNode => {
    if (allSubstItems.length === 0 && (daySubst?.notes.length ?? 0) === 0) {
      return (
        <div className="mt-6">
          <StateMessage
            icon="coffee"
            title={t("changes.emptyAll")}
            hint={t("changes.emptyAllHint")}
          />
        </div>
      );
    }

    if (groupedAllItems.length === 0 && search.trim() !== "") {
      return (
        <div className="mt-6">
          <StateMessage icon="search" title={t("changes.searchNoResults")} />
        </div>
      );
    }

    return (
      <div className="mt-4 flex flex-col gap-5">
        <TextField
          value={search}
          onChange={setSearch}
          placeholder={t("changes.searchPlaceholder")}
          icon="search"
        />

        {daySubst?.notes && daySubst.notes.length > 0 && search.trim() === "" && (
          <Card tone="sunken" radius="lg" elevation="none">
            <h3 className="u-eyebrow mb-1.5">{t("changes.notesFromSchool")}</h3>
            <ul className="flex flex-col gap-1 font-text text-caption text-fg">
              {daySubst.notes.map((note, idx) => (
                <li key={idx}>• {note}</li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          {groupedAllItems.map(([className, items]) => {
            const isMyClass = className === selectedClassShort;
            return (
              <div key={className} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <Badge tone={isMyClass ? "brand" : "quiet"}>
                    {className}
                    {isMyClass ? ` · ${t("changes.filter.myClass")}` : ""}
                  </Badge>
                  <span className="font-text text-caption text-muted">
                    {t("changes.count", { n: items.length })}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {items.map((item, idx) => {
                    const status = substKindToStatus(item.kind);
                    const periodLabel =
                      item.periods.length > 0 ? `${item.periods.join(" – ")}. stunda` : "";

                    return (
                      <Card key={`${className}-${idx}`} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-data text-caption font-bold text-strong">
                            {periodLabel}
                          </span>
                          <StatusBadge status={status} />
                        </div>

                        {item.subject !== null && (
                          <div className="font-display text-body font-black text-strong">
                            {item.subjectFrom !== null ? (
                              <>
                                <span className="line-through opacity-70">{item.subjectFrom}</span>{" "}
                                {ARROW} {item.subject}
                              </>
                            ) : (
                              item.subject
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-1 font-text text-caption text-muted">
                          {item.teacher !== null && (
                            <div className="flex items-center gap-1.5">
                              <Icon name="user-round" size={14} className="shrink-0" />
                              <span>
                                {item.teacherFrom !== null ? (
                                  <>
                                    <span className="line-through opacity-70">
                                      {item.teacherFrom}
                                    </span>{" "}
                                    {ARROW} <strong className="text-fg">{item.teacher}</strong>
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
                                    <span className="line-through opacity-70">{item.roomFrom}</span>{" "}
                                    {ARROW} <strong className="text-fg">{item.room}</strong>
                                  </>
                                ) : (
                                  <strong className="text-fg">{item.room}</strong>
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        {item.raw !== "" && (
                          <div className="mt-1 rounded-lg bg-sunken p-2 font-text text-caption text-fg">
                            <p className="u-eyebrow text-muted">{t("lesson.fromSchool")}</p>
                            <p className="mt-0.5">{item.raw}</p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const body = (): ReactNode => {
    if (!ready) {
      return (
        <div className="mt-4 flex flex-col gap-3">
          <Card className="h-24 animate-pulse bg-sunken" />
          <Card className="h-24 animate-pulse bg-sunken" />
        </div>
      );
    }

    if (selectedClassId === null) {
      return (
        <StateMessage
          icon="graduation-cap"
          title={t("day.noClass")}
          action={<Button onClick={onPickClass}>{t("settings.change")}</Button>}
        />
      );
    }

    return (
      <>
        {syncStatus === "offline" && (
          <Card
            tone="sunken"
            radius="lg"
            elevation="none"
            className="mt-3 flex items-center gap-2 font-text text-caption text-fg"
          >
            <Icon name="wifi-off" size={16} className="shrink-0 text-offline" />
            {t("day.offline")}
          </Card>
        )}

        <div className="mt-4 flex justify-center">
          <SegmentedTabs<ChangesScope>
            items={[
              { key: "myClass", label: t("changes.filter.myClass") },
              { key: "all", label: t("changes.filter.all") },
            ]}
            value={scope}
            onChange={setScope}
          />
        </div>

        <motion.div style={{ x, willChange: "transform" }} className="min-h-0 flex-1">
          {scope === "myClass" ? renderMyClassView() : renderAllClassesView()}
        </motion.div>
      </>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PullToRefresh
        refreshing={syncStatus === "syncing"}
        label={t("sync.pull")}
        releaseLabel={t("sync.release")}
        onRefresh={() => {
          void refresh({ date, force: true });
        }}
      >
        <div
          className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-nav-safe"
          role="group"
          tabIndex={0}
          aria-label={t("day.pageHint")}
          style={{ touchAction: "pan-y" }}
          onTouchStart={onSwipeStart}
          onTouchMove={onSwipeMove}
          onTouchEnd={onSwipeEnd}
          onTouchCancel={onSwipeEnd}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              enterDir.current = 1;
              onDateChange(addDays(date, 1));
            } else if (e.key === "ArrowLeft") {
              enterDir.current = -1;
              onDateChange(addDays(date, -1));
            }
          }}
        >
          <TopBar
            title={
              <div className="flex items-center gap-0.5">
                <IconButton
                  icon="chevron-left"
                  label={t("day.previousDay")}
                  variant="bare"
                  size="sm"
                  onClick={() => {
                    enterDir.current = -1;
                    onDateChange(addDays(date, -1));
                  }}
                />

                <DatePicker
                  date={date}
                  today={now.date}
                  open={calendarOpen}
                  onOpenChange={setCalendarOpen}
                  onSelect={onDateChange}
                />

                <IconButton
                  icon="chevron-right"
                  label={t("day.nextDay")}
                  variant="bare"
                  size="sm"
                  onClick={() => {
                    enterDir.current = 1;
                    onDateChange(addDays(date, 1));
                  }}
                />
              </div>
            }
            actions={
              <>
                <ClassBadge onClick={onPickClass} />
                <SyncBadge onRetry={() => void refresh({ date, force: true })} />
              </>
            }
          />

          {!isToday && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onDateChange(now.date);
                }}
              >
                {t("day.jumpToday")}
              </Button>
            </div>
          )}

          {body()}
        </div>
      </PullToRefresh>

      <LessonSheet lesson={openLesson} day={day} onClose={() => setOpenLesson(null)} />
    </div>
  );
};
