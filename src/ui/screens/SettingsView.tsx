import { useMemo, type ReactNode } from "react";
import { useAppStore } from "@/store";
import { listBuildings } from "@/lib/edupage";
import type { Settings } from "@/db";
import { Button, Card, Icon, SegmentedTabs, Switch, TopBar } from "@/ds";
import { useSelectedClass } from "../hooks/useClasses.ts";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { useUpdateCheck } from "../hooks/useUpdateCheck.ts";
import { useUpdateInstall } from "../hooks/useUpdateInstall.ts";
import { LANGS, LANG_NAMES, useT } from "@/ui/i18n";

const REPO_URL = "https://github.com/dmytropolizhai/stundio";
const REPORT_ISSUE_BASE = `${REPO_URL}/issues/new`;

/** Prefills a GitHub issue with the details a bug report needs but a user won't think to add. */
const reportIssueUrl = (className: string | undefined): string => {
  const body = [
    "**What happened:**",
    "",
    "",
    "---",
    `App version: ${__APP_VERSION__}`,
    `Class: ${className ?? "none selected"}`,
  ].join("\n");
  return `${REPORT_ISSUE_BASE}?${new URLSearchParams({ labels: "bug", body }).toString()}`;
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-7">
    <h2 className="u-eyebrow pb-2">{title}</h2>
    <Card radius="lg" className="p-0">
      {children}
    </Card>
  </section>
);

/** A row inside a section card. Rows after the first carry the hairline. */
const Row = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
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
export const SettingsView = ({ onPickClass }: { onPickClass: () => void }) => {
  const t = useT();
  const selectedClass = useSelectedClass();
  const metas = useAppStore((s) => s.metas);
  const settings = useAppStore((s) => s.settings);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const setBuilding = useAppStore((s) => s.setBuilding);
  const setTheme = useAppStore((s) => s.setTheme);
  const setLang = useAppStore((s) => s.setLang);
  const setMergeConsecutiveLessons = useAppStore((s) => s.setMergeConsecutiveLessons);
  const setShowTime = useAppStore((s) => s.setShowTime);
  const setNotifyLessonReminderMinutes = useAppStore((s) => s.setNotifyLessonReminderMinutes);
  const setNotifySubstitutionChanges = useAppStore((s) => s.setNotifySubstitutionChanges);
  const setNotifyAppUpdates = useAppStore((s) => s.setNotifyAppUpdates);
  const setAnalyticsEnabled = useAppStore((s) => s.setAnalyticsEnabled);
  const refresh = useAppStore((s) => s.refresh);
  const update = useUpdateCheck();
  const install = useUpdateInstall();

  const buildings = useMemo(() => listBuildings(metas), [metas]);

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
      <div className="mx-auto w-full max-w-screen px-gutter pt-safe-top pb-26">
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
                void setNotifyLessonReminderMinutes(Number(value));
              }}
            />
          </Row>
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
                void setNotifySubstitutionChanges(checked);
              }}
            />
          </Row>
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
                void setNotifyAppUpdates(checked);
              }}
            />
          </Row>
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
            <Button size="sm" icon="triangle-alert" asChild>
              <a href={reportIssueUrl(selectedClass?.short)} target="_blank" rel="noreferrer">
                {t("settings.reportIssueAction")}
              </a>
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
    </div>
  );
};
