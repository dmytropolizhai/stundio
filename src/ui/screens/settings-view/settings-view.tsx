import { useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { listBuildings, listSubgroups } from "@/lib/edupage";
import { TopBar } from "@/ds";
import { useSelectedClass } from "@/ui/hooks/useClasses.ts";
import { CustomizationSheet } from "@/ui/screens/sheets/CustomizationSheet.tsx";
import { IdentitySheet } from "@/ui/screens/sheets/IdentitySheet.tsx";
import { FeedbackSheet } from "@/ui/components/FeedbackSheet.tsx";
import { useT } from "@/ui/i18n";
import { PERSONA_PROFILES, useIdentity, useIdentityLabel } from "@/ui/persona";
import { REPO_URL, type FeedbackType } from "@/ui/feedback.ts";
import { ProfileCard } from "./profile-card.tsx";
import { AppearanceSection } from "./appearance-section.tsx";
import { ShareSection } from "./share-section.tsx";
import { ScheduleSection } from "./schedule-section.tsx";
import { NotificationsSection } from "./notifications-section.tsx";
import { DataSection } from "./data-section.tsx";
import { AboutSection } from "./about-section.tsx";
import { DangerSection } from "./danger-section.tsx";
import { CommuteSection } from "./commute-section.tsx";

type SettingsViewProps = {
  onPickClass: () => void;
  onPickTeacher?: () => void;
  onShowWhatsNew: () => void;
  onShowTeacherAnnouncement?: (() => void) | undefined;
  onShowIphoneInstall?: (() => void) | undefined;
};

/**
 * Settings — the DS UI kit's "Me" screen.
 *
 * Every control writes straight through the store to the cache, so a change survives a cold
 * start without a save button.
 *
 * One row shape throughout (`SettingsRow`): an icon tile to scan by, a one-sentence description,
 * the current value on the right, and a switch or a chevron. Closed sets (theme, language,
 * building, subgroup, reminder time) open a `ChoiceSheet` that repeats the row's description.
 * Groups run from what changes most often (the schedule) to what changes least (about, reset).
 */
export const SettingsView = ({
  onPickClass,
  onPickTeacher,
  onShowWhatsNew,
  onShowTeacherAnnouncement,
  onShowIphoneInstall,
}: SettingsViewProps) => {
  const t = useT();
  const [customizing, setCustomizing] = useState(false);
  const [identitySheetOpen, setIdentitySheetOpen] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{ open: boolean; type: FeedbackType }>({
    open: false,
    type: "suggestion",
  });

  const { persona } = useIdentity();
  const subgroup = useAppStore((s) => s.settings.subgroup);
  const building = useAppStore((s) => s.settings.building);
  const identityLabel = useIdentityLabel();
  const selectedClass = useSelectedClass();
  const metas = useAppStore((s) => s.metas);
  const timetables = useAppStore((s) => s.timetables);

  const buildings = useMemo(() => listBuildings(metas), [metas]);
  const subgroups = useMemo(
    () =>
      selectedClass === null ? [] : listSubgroups(Object.values(timetables), selectedClass.id),
    [timetables, selectedClass],
  );

  const facts = [
    ...(PERSONA_PROFILES[persona].hasSubgroups && subgroups.length > 1
      ? [`${t("settings.subgroup")}: ${subgroup ?? t("settings.subgroupAll")}`]
      : []),
    ...(buildings.length > 1
      ? [`${t("settings.building")}: ${building ?? t("settings.buildingAuto")}`]
      : []),
  ];

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-nav-safe">
        <TopBar title={t("settings.title")} />

        <ProfileCard
          persona={persona}
          label={identityLabel}
          facts={facts}
          onChangeIdentity={() => setIdentitySheetOpen(true)}
        />

        <ScheduleSection buildings={buildings} subgroups={subgroups} />

        {PERSONA_PROFILES[persona].nav.personal.includes("transit") && <CommuteSection />}

        <NotificationsSection onShowIphoneInstall={onShowIphoneInstall} />

        <AppearanceSection onOpenCustomization={() => setCustomizing(true)} />

        <ShareSection
          onShowTeacherAnnouncement={onShowTeacherAnnouncement}
          onShowIphoneInstall={onShowIphoneInstall}
        />

        <DataSection />

        <AboutSection
          onShowWhatsNew={onShowWhatsNew}
          onOpenFeedback={(type) => setFeedbackState({ open: true, type })}
        />

        <DangerSection />

        <div className="flex flex-col items-center gap-2 px-4 pt-2 pb-4 text-center">
          <p className="max-w-sm font-text text-caption text-muted">{t("settings.aboutText")}</p>
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

      <IdentitySheet
        open={identitySheetOpen}
        onClose={() => setIdentitySheetOpen(false)}
        onPickClass={onPickClass}
        onPickTeacher={() => onPickTeacher?.()}
      />

      <CustomizationSheet
        open={customizing}
        onClose={() => {
          setCustomizing(false);
        }}
      />

      <FeedbackSheet
        open={feedbackState.open}
        type={feedbackState.type}
        description={
          feedbackState.type === "bug"
            ? t("settings.reportIssueHint")
            : t("settings.suggestFeatureHint")
        }
        onClose={() => {
          setFeedbackState((s) => ({ ...s, open: false }));
        }}
      />
    </div>
  );
};
