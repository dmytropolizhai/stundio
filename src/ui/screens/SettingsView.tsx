import { useMemo, type ReactNode } from "react";
import { useAppStore } from "@/store";
import { listBuildings } from "@/lib/edupage";
import type { Settings } from "@/db";
import { Button, Card, Icon, SegmentedTabs, Switch, TopBar } from "@/ds";
import { useSelectedClass } from "../hooks/useClasses.ts";
import { SyncBadge } from "../components/SyncBadge.tsx";
import { useUpdateCheck } from "../hooks/useUpdateCheck.ts";
import { LANGS, LANG_NAMES, useT } from "@/ui/i18n";

const REPORT_ISSUE_BASE = "https://github.com/dmytropolizhai/stundio/issues/new";

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
  const refresh = useAppStore((s) => s.refresh);
  const update = useUpdateCheck();

  const buildings = useMemo(() => listBuildings(metas), [metas]);

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

        <Section title={t("settings.data")}>
          <Row className="flex flex-wrap items-center justify-between gap-3">
            <SyncBadge />
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
              <Button size="sm" icon="external-link" asChild>
                <a href={update.url} target="_blank" rel="noreferrer">
                  {t("settings.updateAction")}
                </a>
              </Button>
            </Row>
          )}
        </Section>
      </div>
    </div>
  );
};
