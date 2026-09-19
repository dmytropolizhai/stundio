import { useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { listBuildings, listSubgroups } from "@/lib/edupage";
import { TopBar } from "@/ds";
import { useSelectedClass } from "@/ui/hooks/useClasses.ts";
import { CustomizationSheet } from "@/ui/screens/sheets/CustomizationSheet.tsx";
import { FeedbackSheet } from "@/ui/components/FeedbackSheet.tsx";
import { useT } from "@/ui/i18n";
import { REPO_URL, type FeedbackType } from "@/ui/feedback.ts";
import { ClassSection } from "./class-section.tsx";
import { CustomizationSection } from "./customization-section.tsx";
import { GeneralSection } from "./general-section.tsx";
import { ShareSection } from "./share-section.tsx";
import { ScheduleSection } from "./schedule-section.tsx";
import { NotificationsSection } from "./notifications-section.tsx";
import { DataSection } from "./data-section.tsx";
import { AboutSection } from "./about-section.tsx";
import { DangerSection } from "./danger-section.tsx";

type SettingsViewProps = {
  onPickClass: () => void;
  onShowWhatsNew: () => void;
  onShowIphoneAnnouncement?: (() => void) | undefined;
  onShowIphoneInstall?: (() => void) | undefined;
};

/**
 * Settings — the DS UI kit's "Me" screen.
 *
 * Every control writes straight through the store to the cache, so a change survives a cold
 * start without a save button.
 *
 * Theme, language and building are all small closed sets, so all three use the DS segmented
 * control rather than three different shapes of picker.
 */
export const SettingsView = ({
  onPickClass,
  onShowWhatsNew,
  onShowIphoneAnnouncement,
  onShowIphoneInstall,
}: SettingsViewProps) => {
  const t = useT();
  const [customizing, setCustomizing] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{ open: boolean; type: FeedbackType }>({
    open: false,
    type: "suggestion",
  });

  const selectedClass = useSelectedClass();
  const metas = useAppStore((s) => s.metas);
  const timetables = useAppStore((s) => s.timetables);

  const buildings = useMemo(() => listBuildings(metas), [metas]);
  const subgroups = useMemo(
    () =>
      selectedClass === null ? [] : listSubgroups(Object.values(timetables), selectedClass.id),
    [timetables, selectedClass],
  );

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-nav-safe">
        <TopBar title={t("settings.title")} />

        <ClassSection selectedClass={selectedClass} onPickClass={onPickClass} />

        <CustomizationSection onOpenCustomization={() => setCustomizing(true)} />

        <GeneralSection buildings={buildings} subgroups={subgroups} />

        <ShareSection
          onShowIphoneAnnouncement={onShowIphoneAnnouncement}
          onShowIphoneInstall={onShowIphoneInstall}
        />

        <ScheduleSection />

        <NotificationsSection
          selectedClass={selectedClass}
          onShowIphoneInstall={onShowIphoneInstall}
        />

        <DataSection />

        <AboutSection
          onShowWhatsNew={onShowWhatsNew}
          onOpenFeedback={(type) => setFeedbackState({ open: true, type })}
        />

        <DangerSection />

        <div className="flex justify-center pt-2 pb-4">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="font-text text-caption text-muted underline"
          >
            {t("settings.madeBy")}
          </a>
        </div>
      </div>

      <CustomizationSheet
        open={customizing}
        onClose={() => {
          setCustomizing(false);
        }}
      />

      <FeedbackSheet
        open={feedbackState.open}
        type={feedbackState.type}
        onClose={() => {
          setFeedbackState((s) => ({ ...s, open: false }));
        }}
        className={selectedClass?.short}
      />
    </div>
  );
};
