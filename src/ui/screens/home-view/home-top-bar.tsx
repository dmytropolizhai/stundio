/**
 * The top of the Home screen: a greeting for the time of day, and the screen-wide actions —
 * whose schedule this is, sync state, view options — plus a form teacher's own / form-class
 * switch, which changes everything below it, brief and schedule alike.
 */
import { SegmentedTabs, TopBar } from "@/ds";
import { ClassBadge } from "@/ui/components/ClassBadge.tsx";
import { SyncBadge } from "@/ui/components/SyncBadge.tsx";
import { ViewOptionsMenu } from "@/ui/components/ViewOptionsMenu.tsx";
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
            <ClassBadge onClick={onPickClass} />
            <SyncBadge onRetry={onRefresh} />
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
