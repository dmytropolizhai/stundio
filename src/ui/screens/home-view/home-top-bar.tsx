/**
 * The top of the Home screen: a greeting for the time of day, view options, and a form teacher's
 * own / form-class switch. On phones, class identity and sync freshness live in the fixed
 * `StatusBar` (with class switching in `MoreSheet`); wide layouts keep `ClassBadge` and
 * `SyncBadge` here.
 */
import { SegmentedTabs, TopBar } from "@/ds";
import { ClassBadge } from "@/ui/components/ClassBadge.tsx";
import { SyncBadge } from "@/ui/components/SyncBadge.tsx";
import { ViewOptionsMenu } from "@/ui/components/ViewOptionsMenu.tsx";
import { useLayout } from "@/ui/hooks/useLayout.ts";
import { useT } from "@/ui/i18n";
import { useAppStore, useSettingSetter } from "@/store";
import { useIsFormTeacher } from "@/ui/persona";
import { greetingKey } from "./greeting.ts";

type HomeTopBarProps = {
  nowMinutes: number;
  onPickClass: () => void;
  onRefresh: () => void;
};

export const HomeTopBar = ({ nowMinutes, onPickClass, onRefresh }: HomeTopBarProps) => {
  const t = useT();
  const wide = useLayout() !== "phone";
  const teacherView = useAppStore((s) => s.settings.teacherView);
  const setTeacherView = useSettingSetter("teacherView");
  const isFormTeacher = useIsFormTeacher();
  const showTime = useAppStore((s) => s.settings.showTime);
  const setShowTime = useSettingSetter("showTime");

  return (
    <>
      <TopBar
        title={t(greetingKey(nowMinutes))}
        actions={
          <>
            {wide && (
              <>
                <ClassBadge onClick={onPickClass} />
                <SyncBadge onRetry={onRefresh} />
              </>
            )}
            <ViewOptionsMenu
              options={[
                {
                  key: "showTime",
                  icon: "clock",
                  label: t("settings.showTime"),
                  checked: showTime,
                  onChange: (checked) => {
                    void setShowTime(checked);
                  },
                },
              ]}
            />
          </>
        }
      />

      {isFormTeacher && (
        <div className="mb-4 flex justify-center" data-testid="form-teacher-segment">
          <SegmentedTabs<"own" | "form-class">
            label={t("teacher.formClass")}
            items={[
              { key: "own", label: t("teacher.view.own") },
              { key: "form-class", label: t("teacher.view.formClass") },
            ]}
            value={teacherView}
            onChange={(v) => {
              void setTeacherView(v);
            }}
          />
        </div>
      )}
    </>
  );
};
