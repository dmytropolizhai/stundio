import { useState } from "react";
import { BottomSheet, Button } from "@/ds";
import { isNativePlatform } from "@/lib/edupage";
import { isDesktop } from "@/lib/desktop";
import type { FeedbackType } from "@/ui/feedback.ts";
import { useUpdateCheck } from "@/ui/hooks/useUpdateCheck.ts";
import { useUpdateInstall } from "@/ui/hooks/useUpdateInstall.ts";
import { useLang, useT } from "@/ui/i18n";
import { Section } from "./settings-section.tsx";
import { SettingsRow, StatusDot, ValueBadge } from "./settings-row.tsx";
import { SheetDescription, SheetTitle } from "./settings-sheet.tsx";

/**
 * The standalone donation page (`public/donate.html`). Absolute, because on Android the app is
 * served from the APK and `/donate` would resolve inside it; `?lang=` keeps the page in the
 * app's language instead of the browser's.
 */
const DONATE_URL = "https://stundio.pages.dev/donate";

type AboutSectionProps = {
  onShowWhatsNew: () => void;
  onOpenFeedback: (type: FeedbackType) => void;
};

/**
 * The native update flow, moved off the row into its sheet: the row only says whether there is
 * something new, the sheet says what and does it.
 */
const UpdateSheet = ({
  open,
  onClose,
  check,
  install,
}: {
  open: boolean;
  onClose: () => void;
  /** The section's own check, shared so opening the sheet never starts a second request. */
  check: ReturnType<typeof useUpdateCheck>;
  /** Owned by the section too, so the row can show a download that outlives the sheet. */
  install: ReturnType<typeof useUpdateInstall>;
}) => {
  const t = useT();
  const { result: update, checking, checked, recheck } = check;

  // No status line until there is one: the current version is already printed underneath.
  const status = update?.hasUpdate
    ? t("settings.updateAvailable", { version: update.latestVersion })
    : checked
      ? t("settings.upToDate")
      : checking
        ? t("settings.checkingForUpdates")
        : undefined;

  let action;
  if (update?.hasUpdate) {
    if (install.canInstallInApp && update.apkUrl) {
      const apkUrl = update.apkUrl;
      action =
        install.phase === "downloading" ? (
          <p className="font-text text-caption text-muted">
            {t("settings.updateDownloading", { percent: install.percent })}
          </p>
        ) : (
          <Button
            block
            icon="download"
            onClick={() => {
              void install.install(apkUrl);
            }}
          >
            {t("settings.updateAction")}
          </Button>
        );
    } else {
      action = (
        <Button block icon="external-link" asChild>
          <a href={update.url} target="_blank" rel="noreferrer">
            {t("settings.updateAction")}
          </a>
        </Button>
      );
    }
  } else {
    action = (
      <Button variant="outline" block icon="refresh-cw" disabled={checking} onClick={recheck}>
        {checking ? t("settings.checkingForUpdates") : t("settings.checkForUpdatesAction")}
      </Button>
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={<SheetTitle icon="download">{t("settings.updates")}</SheetTitle>}
      footer={action}
    >
      <SheetDescription>{t("settings.updatesHint")}</SheetDescription>
      {status !== undefined && (
        <p className="font-text text-body font-bold text-strong">{status}</p>
      )}
      <p className="mt-0.5 font-text text-caption text-muted">
        {t("settings.currentVersion", { version: __APP_VERSION__ })}
      </p>
      {install.phase === "error" && (
        <p className="mt-2 font-text text-caption text-danger">
          {t("settings.updateError", { message: install.message })}
        </p>
      )}
    </BottomSheet>
  );
};

export const AboutSection = ({ onShowWhatsNew, onOpenFeedback }: AboutSectionProps) => {
  const t = useT();
  const lang = useLang();
  const isNative = isNativePlatform();
  const check = useUpdateCheck({ enabled: isNative });
  const { result: update, checking, checked } = check;
  const install = useUpdateInstall();
  const [updateOpen, setUpdateOpen] = useState(false);

  const updateValue =
    install.phase === "downloading" ? (
      t("settings.updateDownloading", { percent: install.percent })
    ) : install.phase === "error" ? (
      <>
        <StatusDot tone="danger" />
        <span className="truncate">{t("settings.updateFailed")}</span>
      </>
    ) : update?.hasUpdate ? (
      <>
        <StatusDot tone="warning" />
        <ValueBadge>{update.latestVersion}</ValueBadge>
      </>
    ) : checking ? (
      t("settings.checkingForUpdates")
    ) : checked ? (
      t("settings.upToDate")
    ) : (
      __APP_VERSION__
    );

  return (
    <Section title={t("settings.about")}>
      <SettingsRow
        icon="sparkles"
        label={t("settings.whatsNew")}
        description={t("settings.whatsNewHint")}
        onClick={onShowWhatsNew}
      />
      {isNative ? (
        <SettingsRow
          icon="download"
          label={t("settings.updates")}
          description={t("settings.updatesHint")}
          value={updateValue}
          onClick={() => setUpdateOpen(true)}
        />
      ) : (
        <SettingsRow
          icon="info"
          label={t("settings.version")}
          description={t(isDesktop() ? "settings.desktopUpdatesHint" : "settings.versionHint")}
          value={__APP_VERSION__}
        />
      )}
      <SettingsRow
        icon="bug"
        label={t("settings.reportIssueRow")}
        description={t("settings.reportIssueHint")}
        onClick={() => onOpenFeedback("bug")}
      />
      <SettingsRow
        icon="lightbulb"
        label={t("settings.suggestFeatureRow")}
        description={t("settings.suggestFeatureHint")}
        onClick={() => onOpenFeedback("suggestion")}
      />
      <SettingsRow
        icon="coffee"
        label={t("settings.donateRow")}
        description={t("settings.donateHint")}
        href={`${DONATE_URL}?lang=${lang}`}
      />

      {isNative && (
        <UpdateSheet
          open={updateOpen}
          onClose={() => setUpdateOpen(false)}
          check={check}
          install={install}
        />
      )}
    </Section>
  );
};
