import { useMemo, useState } from "react";
import { useAppStore, useSettingSetter } from "@/store";
import { listBuildings, listSubgroups } from "@/lib/edupage";
import { Icon, IconButton, TopBar, type IconName } from "@/ds";
import { useSelectedClass } from "@/ui/hooks/useClasses.ts";
import { CustomizationSheet } from "@/ui/screens/sheets/CustomizationSheet.tsx";
import { IdentitySheet } from "@/ui/screens/sheets/IdentitySheet.tsx";
import { FeedbackSheet } from "@/ui/components/FeedbackSheet.tsx";
import { useT } from "@/ui/i18n";
import { PERSONA_PROFILES, useIdentity, useIdentityLabel } from "@/ui/persona";
import { AUTHOR_URL, REPO_URL, SITE_URL, type FeedbackType } from "@/ui/feedback.ts";
import { WatchingCard } from "./watching-card.tsx";
import { StatusStrip } from "./status-strip.tsx";
import { AppearanceSection } from "./appearance-section.tsx";
import { TakeAwaySection } from "./take-away-section.tsx";
import { NotificationsSection } from "./notifications-section.tsx";
import { AboutSection } from "./about-section.tsx";
import { MoreSection } from "./more-section.tsx";
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
 * Settings, ordered by why a student opens it rather than by how the code is organised:
 *
 * 1. What am I looking at — the identity plus the subgroup and building filters, switched in place.
 * 2. Is the app in a good state — data freshness and the one fix that matters (blocked alerts).
 * 3. Notifications, 4. Appearance (theme thumbnails, language, what the screens show),
 * 5. Taking the timetable out (calendar, class announcement), 6. The app itself,
 * then one folded "More" for what is set once a term, and the reset on its own.
 *
 * Every control writes straight through the store to the cache, so a change survives a cold
 * start without a save button. One row shape throughout (`SettingsRow`); closed sets longer than
 * three (language, reminder time) open a `ChoiceSheet`.
 */
export const SettingsView = ({
  onPickClass,
  onPickTeacher,
  onShowWhatsNew,
  onShowTeacherAnnouncement,
  onShowIphoneInstall,
}: SettingsViewProps) => {
  const t = useT();
  // Credits under the screen: the code, the person, the site. Names stay as written; only
  // "Author" is chrome and gets translated.
  const creditLinks: { href: string; icon: IconName; label: string }[] = [
    { href: REPO_URL, icon: "code-xml", label: "GitHub" },
    { href: AUTHOR_URL, icon: "user-round", label: t("settings.creditAuthor") },
    { href: SITE_URL, icon: "globe", label: "stundio.lv" },
  ];
  const [customizing, setCustomizing] = useState(false);
  const [identitySheetOpen, setIdentitySheetOpen] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{ open: boolean; type: FeedbackType }>({
    open: false,
    type: "suggestion",
  });

  const { persona } = useIdentity();
  const mapEnabled = useAppStore((s) => s.settings.transitMapEnabled);
  const setMapEnabled = useSettingSetter("transitMapEnabled");
  const hasTransit = PERSONA_PROFILES[persona].nav.personal.includes("transit");
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

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-nav-safe">
        <TopBar
          title={t("settings.title")}
          actions={
            hasTransit && (
              <IconButton
                icon="bus-front"
                variant={mapEnabled ? "brand" : "light"}
                aria-pressed={mapEnabled}
                label={t(mapEnabled ? "settings.transitMap.hide" : "settings.transitMap.show")}
                onClick={() => void setMapEnabled(!mapEnabled)}
              />
            )
          }
        />

        <WatchingCard
          persona={persona}
          label={identityLabel ?? null}
          buildings={buildings}
          subgroups={subgroups}
          onChangeIdentity={() => setIdentitySheetOpen(true)}
        />

        <StatusStrip />

        <NotificationsSection onShowIphoneInstall={onShowIphoneInstall} />

        <AppearanceSection onOpenCustomization={() => setCustomizing(true)} />

        {hasTransit && <CommuteSection />}

        <TakeAwaySection onShowTeacherAnnouncement={onShowTeacherAnnouncement} />

        <AboutSection
          onShowWhatsNew={onShowWhatsNew}
          onOpenFeedback={(type) => setFeedbackState({ open: true, type })}
        />

        <MoreSection />

        <DangerSection />

        <div className="flex flex-col items-center gap-2 px-4 pt-2 pb-4 text-center">
          <p className="max-w-sm font-text text-caption text-muted">{t("settings.aboutText")}</p>
          <p className="font-text text-caption text-muted">{t("settings.madeBy")}</p>
          <nav aria-label={t("settings.creditLinks")}>
            <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0">
              {creditLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener"
                    className="flex min-h-11 items-center gap-1.5 rounded-full px-3 font-text text-caption font-bold text-muted transition-colors hover:text-strong focus-visible:text-strong"
                  >
                    <Icon name={link.icon} size={14} />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
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
