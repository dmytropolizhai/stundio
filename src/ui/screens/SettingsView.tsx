import { useMemo, useState, type ReactNode } from "react";
import { useAppStore } from "@/store";
import { isNativePlatform, listBuildings, listSubgroups } from "@/lib/edupage";
import type { Settings } from "@/db";
import { Icon } from "@/ds/components/ui/icon";
import { Button, Card, SegmentedTabs, Switch, TopBar } from "@/ds";
import {
  ensureNotificationPermission,
  openNotificationSettings,
} from "@/notifications/localNotifications";
import { isWebPushSupported, subscribeWebPush, unsubscribeWebPush } from "@/notifications/webPush";
import { useSelectedClass } from "../hooks/useClasses.ts";
import { useNotificationPermissionDenied } from "../hooks/useNotificationPermission.ts";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { useUpdateCheck } from "../hooks/useUpdateCheck.ts";
import { useUpdateInstall } from "../hooks/useUpdateInstall.ts";
import { CustomizationSheet } from "./CustomizationSheet.tsx";
import { FeedbackSheet } from "../components/FeedbackSheet.tsx";
import { LANGS, LANG_NAMES, useT } from "@/ui/i18n";
import { REPO_URL, type FeedbackType } from "@/ui/feedback.ts";
import { isIosDevice, isStandalonePwa } from "../lib/platform.ts";

/** Also used by `CustomizationSheet`, which shares this screen's section/row look. */
export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-7">
    <h2 className="u-eyebrow pb-2">{title}</h2>
    <Card radius="lg" className="p-0">
      {children}
    </Card>
  </section>
);

/** A row inside a section card. Rows after the first carry the hairline. */
export const Row = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`px-4 py-3.5 not-first:border-t not-first:border-hairline ${className}`}>
    {children}
  </div>
);

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
}: {
  onPickClass: () => void;
  onShowWhatsNew: () => void;
  onShowIphoneAnnouncement?: () => void;
  onShowIphoneInstall?: () => void;
}) => {
  const t = useT();
  const [customizing, setCustomizing] = useState(false);
  const [feedbackState, setFeedbackState] = useState<{ open: boolean; type: FeedbackType }>({
    open: false,
    type: "suggestion",
  });
  const notifyPermissionDenied = useNotificationPermissionDenied();
  const selectedClass = useSelectedClass();
  const metas = useAppStore((s) => s.metas);
  const timetables = useAppStore((s) => s.timetables);
  const settings = useAppStore((s) => s.settings);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const setBuilding = useAppStore((s) => s.setBuilding);
  const setSubgroup = useAppStore((s) => s.setSubgroup);
  const setTheme = useAppStore((s) => s.setTheme);
  const setLang = useAppStore((s) => s.setLang);
  const setMergeConsecutiveLessons = useAppStore((s) => s.setMergeConsecutiveLessons);
  const setShowTime = useAppStore((s) => s.setShowTime);
  const setNotifyLessonReminderMinutes = useAppStore((s) => s.setNotifyLessonReminderMinutes);
  const setNotifySubstitutionChanges = useAppStore((s) => s.setNotifySubstitutionChanges);
  const setNotifyAppUpdates = useAppStore((s) => s.setNotifyAppUpdates);
  const setAnalyticsEnabled = useAppStore((s) => s.setAnalyticsEnabled);
  const setShareLang = useAppStore((s) => s.setShareLang);
  const setShareLangSyncWithApp = useAppStore((s) => s.setShareLangSyncWithApp);
  const refresh = useAppStore((s) => s.refresh);
  const {
    result: update,
    checking: checkingUpdate,
    checked: updateChecked,
    recheck,
  } = useUpdateCheck();
  const install = useUpdateInstall();

  const buildings = useMemo(() => listBuildings(metas), [metas]);
  const subgroups = useMemo(
    () =>
      selectedClass === null ? [] : listSubgroups(Object.values(timetables), selectedClass.id),
    [timetables, selectedClass],
  );

  const reminderOptions: { key: string; label: string }[] = [
    { key: "0", label: t("settings.notifyLessonReminderOff") },
    { key: "5", label: "5" },
    { key: "10", label: "10" },
    { key: "15", label: "15" },
    { key: "30", label: "30" },
  ];

  const themes: { key: Settings["theme"]; label: string }[] = [
    { key: "system", label: t("theme.system") },
    { key: "light", label: t("theme.light") },
    { key: "dark", label: t("theme.dark") },
  ];

  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-nav-safe">
        <TopBar title={t("settings.title")} />

        <Section title={t("settings.class")}>
          <button
            type="button"
            onClick={onPickClass}
            className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 py-3.5 text-left"
          >
            <span className="font-text text-body font-bold text-strong">
              {selectedClass?.short ?? t("day.noClass")}
            </span>
            <span className="inline-flex items-center gap-1 font-text text-caption font-bold text-link">
              {t("settings.change")}
              <Icon name="chevron-right" size={16} />
            </span>
          </button>
        </Section>

        <Section title={t("settings.customization")}>
          <button
            type="button"
            onClick={() => {
              setCustomizing(true);
            }}
            className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-4 py-3.5 text-left"
          >
            <span className="font-text text-body font-bold text-strong">
              {t("settings.customizationOpen")}
            </span>
            <Icon name="chevron-right" size={16} className="text-muted" />
          </button>
        </Section>

        {buildings.length > 1 && (
          <Section title={t("settings.building")}>
            <Row>
              <SegmentedTabs
                label={t("settings.building")}
                value={settings.building ?? ""}
                items={[
                  { key: "", label: t("settings.buildingAuto") },
                  ...buildings.map((b) => ({ key: b, label: b })),
                ]}
                onChange={(value) => {
                  void setBuilding(value === "" ? null : value);
                }}
              />
            </Row>
          </Section>
        )}

        {subgroups.length > 1 && (
          <Section title={t("settings.subgroup")}>
            <Row>
              <SegmentedTabs
                label={t("settings.subgroup")}
                value={settings.subgroup ?? ""}
                items={[
                  { key: "", label: t("settings.subgroupAll") },
                  ...subgroups.map((g) => ({ key: g, label: g })),
                ]}
                onChange={(value) => {
                  void setSubgroup(value === "" ? null : value);
                }}
              />
            </Row>
          </Section>
        )}

        <Section title={t("settings.theme")}>
          <Row>
            <SegmentedTabs
              label={t("settings.theme")}
              value={settings.theme}
              items={themes}
              onChange={(value) => {
                void setTheme(value);
              }}
            />
          </Row>
        </Section>

        <Section title={t("settings.language")}>
          <Row>
            <SegmentedTabs
              label={t("settings.language")}
              value={settings.lang}
              items={LANGS.map((key) => ({ key, label: LANG_NAMES[key] }))}
              onChange={(value) => {
                void setLang(value);
              }}
            />
          </Row>
        </Section>

        <Section title={t("settings.share")}>
          <Row className="flex items-start justify-between gap-3">
            <div>
              <p className="font-text text-body font-bold text-strong">
                {t("settings.shareSyncLang")}
              </p>
              <p className="mt-0.5 font-text text-caption text-muted">
                {t("settings.shareSyncLangHint")}
              </p>
            </div>
            <Switch
              aria-label={t("settings.shareSyncLang")}
              checked={settings.shareLangSyncWithApp}
              onChange={(checked) => {
                void setShareLangSyncWithApp(checked);
              }}
            />
          </Row>
          {!settings.shareLangSyncWithApp && (
            <Row>
              <SegmentedTabs
                label={t("settings.shareLanguage")}
                value={settings.shareLang}
                items={LANGS.map((key) => ({ key, label: LANG_NAMES[key] }))}
                onChange={(value) => {
                  void setShareLang(value);
                }}
              />
            </Row>
          )}
          {onShowIphoneAnnouncement !== undefined && (
            <Row className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-text text-body font-bold text-strong">
                  {t("settings.iphoneShare")}
                </p>
                <p className="mt-0.5 font-text text-caption text-muted">
                  {t("settings.iphoneShareHint")}
                </p>
              </div>
              <Button size="sm" icon="share-2" onClick={onShowIphoneAnnouncement}>
                {t("settings.iphoneShareAction")}
              </Button>
            </Row>
          )}
          {onShowIphoneInstall !== undefined && isIosDevice() && !isStandalonePwa() && (
            <Row className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-text text-body font-bold text-strong">
                  {t("settings.iphoneInstall")}
                </p>
                <p className="mt-0.5 font-text text-caption text-muted">
                  {t("settings.iphoneInstallHint")}
                </p>
              </div>
              <Button size="sm" icon="plus" onClick={onShowIphoneInstall}>
                {t("settings.iphoneInstall")}
              </Button>
            </Row>
          )}
        </Section>

        <Section title={t("settings.week")}>
          <Row className="flex items-start justify-between gap-3">
            <div>
              <p className="font-text text-body font-bold text-strong">
                {t("settings.mergeLessons")}
              </p>
              <p className="mt-0.5 font-text text-caption text-muted">
                {t("settings.mergeLessonsHint")}
              </p>
            </div>
            <Switch
              aria-label={t("settings.mergeLessons")}
              checked={settings.mergeConsecutiveLessons}
              onChange={(checked) => {
                void setMergeConsecutiveLessons(checked);
              }}
            />
          </Row>
        </Section>

        <Section title={t("settings.day")}>
          <Row className="flex items-start justify-between gap-3">
            <div>
              <p className="font-text text-body font-bold text-strong">{t("settings.showTime")}</p>
              <p className="mt-0.5 font-text text-caption text-muted">
                {t("settings.showTimeHint")}
              </p>
            </div>
            <Switch
              aria-label={t("settings.showTime")}
              checked={settings.showTime}
              onChange={(checked) => {
                void setShowTime(checked);
              }}
            />
          </Row>
        </Section>

        <Section title={t("settings.notifications")}>
          {isIosDevice() && !isStandalonePwa() ? (
            <Row className="flex flex-wrap items-center justify-between gap-3">
              <div className="max-w-md">
                <p className="font-text text-body font-bold text-strong">
                  {t("settings.notificationsIosPwaRequired")}
                </p>
              </div>
              {onShowIphoneInstall !== undefined && (
                <Button size="sm" icon="plus" onClick={onShowIphoneInstall}>
                  {t("settings.iphoneInstall")}
                </Button>
              )}
            </Row>
          ) : !isNativePlatform() && !isWebPushSupported() ? (
            <Row>
              <p className="font-text text-caption text-muted">
                {t("settings.notificationsWebNotice")}
              </p>
            </Row>
          ) : (
            <>
              {notifyPermissionDenied && (
                <Row className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-text text-caption font-bold text-danger">
                    {t("settings.notifyPermissionDenied")}
                  </p>
                  {isNativePlatform() && (
                    <Button
                      size="sm"
                      icon="external-link"
                      onClick={() => {
                        void openNotificationSettings();
                      }}
                    >
                      {t("settings.notifyOpenSettings")}
                    </Button>
                  )}
                </Row>
              )}
              {isNativePlatform() ? (
                <Row>
                  <p className="mb-2 font-text text-body font-bold text-strong">
                    {t("settings.notifyLessonReminder")}
                  </p>
                  <p className="mb-2.5 font-text text-caption text-muted">
                    {t("settings.notifyLessonReminderHint")}
                  </p>
                  <SegmentedTabs
                    label={t("settings.notifyLessonReminder")}
                    value={String(settings.notifyLessonReminderMinutes)}
                    items={reminderOptions}
                    onChange={(value) => {
                      const minutes = Number(value);
                      if (minutes > 0) void ensureNotificationPermission();
                      void setNotifyLessonReminderMinutes(minutes);
                    }}
                  />
                </Row>
              ) : (
                <Row>
                  <p className="font-text text-caption text-muted">
                    {t("settings.notificationsLessonRemindersNativeNotice")}
                  </p>
                </Row>
              )}
              <Row className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-text text-body font-bold text-strong">
                    {t("settings.notifySubstitutionChanges")}
                  </p>
                  <p className="mt-0.5 font-text text-caption text-muted">
                    {t("settings.notifySubstitutionChangesHint")}
                  </p>
                </div>
                <Switch
                  aria-label={t("settings.notifySubstitutionChanges")}
                  checked={settings.notifySubstitutionChanges}
                  onChange={(checked) => {
                    if (isNativePlatform()) {
                      if (checked) void ensureNotificationPermission();
                    } else if (checked) {
                      if (settings.selectedClassId) {
                        void subscribeWebPush(settings.selectedClassId, settings.lang);
                      }
                    } else {
                      void unsubscribeWebPush();
                    }
                    void setNotifySubstitutionChanges(checked);
                  }}
                />
              </Row>
              {isNativePlatform() && (
                <Row className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-text text-body font-bold text-strong">
                      {t("settings.notifyAppUpdates")}
                    </p>
                    <p className="mt-0.5 font-text text-caption text-muted">
                      {t("settings.notifyAppUpdatesHint")}
                    </p>
                  </div>
                  <Switch
                    aria-label={t("settings.notifyAppUpdates")}
                    checked={settings.notifyAppUpdates}
                    onChange={(checked) => {
                      if (checked) void ensureNotificationPermission();
                      void setNotifyAppUpdates(checked);
                    }}
                  />
                </Row>
              )}
            </>
          )}
        </Section>

        <Section title={t("settings.data")}>
          <Row className="flex flex-wrap items-center justify-between gap-3">
            <SyncBadge collapsible={false} />
            <Button
              size="sm"
              disabled={syncStatus === "syncing"}
              icon="refresh-cw"
              onClick={() => {
                void refresh({ force: true });
              }}
            >
              {t("sync.refresh")}
            </Button>
          </Row>
          <Row className="flex items-start justify-between gap-3">
            <div>
              <p className="font-text text-body font-bold text-strong">{t("settings.analytics")}</p>
              <p className="mt-0.5 font-text text-caption text-muted">
                {t("settings.analyticsHint")}
              </p>
            </div>
            <Switch
              aria-label={t("settings.analytics")}
              checked={settings.analyticsEnabled}
              onChange={(checked) => {
                void setAnalyticsEnabled(checked);
              }}
            />
          </Row>
        </Section>

        <Section title={t("settings.about")}>
          <Row>
            <p className="font-text text-caption text-muted">{t("settings.aboutText")}</p>
          </Row>
          <Row className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-text text-caption font-bold text-strong">
              {t("settings.reportIssue")}
            </span>
            <Button
              size="sm"
              icon="triangle-alert"
              onClick={() => setFeedbackState({ open: true, type: "bug" })}
            >
              {t("settings.reportIssueAction")}
            </Button>
          </Row>
          <Row className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-text text-caption font-bold text-strong">
              {t("settings.suggestFeature")}
            </span>
            <Button
              size="sm"
              icon="plus"
              onClick={() => setFeedbackState({ open: true, type: "suggestion" })}
            >
              {t("settings.suggestFeatureAction")}
            </Button>
          </Row>
          <Row className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-text text-body font-bold text-strong">{t("settings.whatsNew")}</p>
              <p className="mt-0.5 font-text text-caption text-muted">
                {t("settings.whatsNewHint")}
              </p>
            </div>
            <Button size="sm" icon="info" onClick={onShowWhatsNew}>
              {t("settings.whatsNewAction")}
            </Button>
          </Row>
          <Row className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-text text-body font-bold text-strong">
                {updateChecked && !update?.hasUpdate
                  ? t("settings.upToDate")
                  : t("settings.checkForUpdates")}
              </p>
              <p className="mt-0.5 font-text text-caption text-muted">
                {t("settings.currentVersion", { version: __APP_VERSION__ })}
              </p>
            </div>
            <Button size="sm" icon="refresh-cw" disabled={checkingUpdate} onClick={recheck}>
              {checkingUpdate
                ? t("settings.checkingForUpdates")
                : t("settings.checkForUpdatesAction")}
            </Button>
          </Row>
          {update?.hasUpdate && (
            <Row className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-text text-caption font-bold text-strong">
                {t("settings.updateAvailable", { version: update.latestVersion })}
              </span>
              {install.canInstallInApp && update.apkUrl ? (
                install.phase === "downloading" ? (
                  <span className="font-text text-caption text-muted">
                    {t("settings.updateDownloading", { percent: install.percent })}
                  </span>
                ) : (
                  (() => {
                    const apkUrl = update.apkUrl;
                    return (
                      <Button
                        size="sm"
                        icon="download"
                        onClick={() => {
                          void install.install(apkUrl);
                        }}
                      >
                        {t("settings.updateAction")}
                      </Button>
                    );
                  })()
                )
              ) : (
                <Button size="sm" icon="external-link" asChild>
                  <a href={update.url} target="_blank" rel="noreferrer">
                    {t("settings.updateAction")}
                  </a>
                </Button>
              )}
              {install.phase === "error" && (
                <p className="w-full font-text text-caption text-danger">
                  {t("settings.updateError", { message: install.message })}
                </p>
              )}
            </Row>
          )}
        </Section>

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
