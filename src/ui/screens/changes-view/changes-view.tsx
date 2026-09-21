import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { useAppStore } from "@/store";
import { addDays } from "@/sync";
import type { ISODate, ResolvedLesson } from "@/lib/edupage";
import { Button, Card, Icon, SegmentedTabs } from "@/ds";
import { PullToRefresh } from "@/ui/components/PullToRefresh.tsx";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { useNow } from "@/ui/hooks/useNow.ts";
import { useT } from "@/ui/i18n";
import { LessonSheet } from "@/ui/screens/lesson-sheet";
import { ChangesTopBar } from "./changes-top-bar.tsx";
import { ChangesMyClass } from "./changes-my-class.tsx";
import { ChangesAllClasses } from "./changes-all-classes.tsx";

const SWIPE_THRESHOLD_PX = 56;

type ChangesScope = "myClass" | "all";

type ChangesViewProps = {
  date: ISODate;
  onDateChange: (date: ISODate) => void;
  onPickClass: () => void;
};

export const ChangesView = ({ date, onDateChange, onPickClass }: ChangesViewProps) => {
  const t = useT();
  const now = useNow();

  const [scope, setScope] = useState<ChangesScope>("myClass");
  const [search, setSearch] = useState("");
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
          {scope === "myClass" ? (
            <ChangesMyClass
              changedLessons={changedLessons}
              notes={day?.notes}
              otherChangesCount={otherChangesCount}
              onOpenLesson={setOpenLesson}
              onShowAllClasses={() => {
                setScope("all");
              }}
            />
          ) : (
            <ChangesAllClasses
              items={allSubstItems}
              notes={daySubst?.notes}
              selectedClassShort={selectedClassShort}
              search={search}
              onSearchChange={setSearch}
            />
          )}
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
          void refresh({ date, scope: "day", force: true });
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
          <ChangesTopBar
            date={date}
            today={now.date}
            isToday={isToday}
            onDateChange={onDateChange}
            onPickClass={onPickClass}
            onRefresh={() => void refresh({ date, scope: "day", force: true })}
            onNavigate={(dir) => {
              enterDir.current = dir;
            }}
          />

          {body()}
        </div>
      </PullToRefresh>

      <LessonSheet
        lesson={openLesson}
        day={day}
        onClose={() => {
          setOpenLesson(null);
        }}
      />
    </div>
  );
};
