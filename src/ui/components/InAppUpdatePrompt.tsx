import { useState } from "react";
import { Button, Card, IconButton } from "@/ds";
import { useT } from "@/ui/i18n";
import { isNativePlatform } from "@/lib/edupage";
import { useUpdateCheck } from "../hooks/useUpdateCheck.ts";
import { useUpdateInstall } from "../hooks/useUpdateInstall.ts";

/**
 * In-app banner notifying native Android users when a new release is available on GitHub.
 * Allows 1-tap download and in-app installation.
 */
export const InAppUpdatePrompt = () => {
  const t = useT();
  const [dismissed, setDismissed] = useState(false);
  const { result: update } = useUpdateCheck();
  const installState = useUpdateInstall();
  const { install, canInstallInApp } = installState;

  if (dismissed || !isNativePlatform() || !update?.hasUpdate || !update.apkUrl) {
    return null;
  }

  const isDownloading = installState.phase === "downloading";

  return (
    <Card
      tone="sunken"
      radius="lg"
      elevation="none"
      className="mb-3 flex items-start gap-3 p-4 border border-brand/20 bg-brand/5"
      data-testid="in-app-update-prompt"
    >
      <div className="min-w-0 flex-1">
        <p className="font-text text-body font-bold text-strong">{t("day.updatePrompt.title")}</p>
        <p className="mt-0.5 font-text text-caption text-muted">
          {t("day.updatePrompt.body", { version: update.latestVersion })}
        </p>

        {installState.phase === "downloading" ? (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-pill bg-hairline">
              <div
                className="h-full bg-brand transition-all duration-150"
                style={{ width: `${installState.percent}%` }}
              />
            </div>
            <span className="font-mono text-caption text-muted">{installState.percent}%</span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              icon="download"
              onClick={() => {
                if (update.apkUrl) {
                  void install(update.apkUrl);
                }
              }}
            >
              {t("day.updatePrompt.action")}
            </Button>
            {!canInstallInApp && (
              <Button asChild size="sm" variant="ghost">
                <a href={update.url} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </Button>
            )}
          </div>
        )}
      </div>

      {!isDownloading && (
        <IconButton
          icon="x"
          label={t("day.updatePrompt.dismiss")}
          variant="bare"
          size="sm"
          onClick={() => setDismissed(true)}
        />
      )}
    </Card>
  );
};
