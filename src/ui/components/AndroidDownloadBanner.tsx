import { memo } from "react";
import { useAppStore } from "@/store";
import { Button, Card, IconButton } from "@/ds";
import { useT } from "@/ui/i18n";
import { isNativePlatform } from "@/lib/edupage";
import { isAndroidDevice } from "../lib/platform";

/**
 * Banner shown only to users visiting the web app / PWA on Android devices.
 * Informs them about the native Android app (widgets, background sync) and provides a 1-tap APK download link.
 */
export const AndroidDownloadBanner = memo(function AndroidDownloadBanner() {
  const t = useT();
  const dismissed = useAppStore((s) => s.settings.androidApkBannerDismissed);
  const setDismissed = useAppStore((s) => s.setAndroidApkBannerDismissed);

  if (isNativePlatform() || !isAndroidDevice() || dismissed) {
    return null;
  }

  return (
    <Card
      tone="sunken"
      radius="lg"
      elevation="none"
      className="mb-3 flex items-start gap-3 p-4"
      data-testid="android-download-banner"
    >
      <div className="min-w-0 flex-1">
        <p className="font-text text-body font-bold text-strong">{t("day.androidBanner.title")}</p>
        <p className="mt-0.5 font-text text-caption text-muted">{t("day.androidBanner.body")}</p>
        <div className="mt-3">
          <Button asChild size="sm" icon="download">
            <a href="/download" download>
              {t("day.androidBanner.action")}
            </a>
          </Button>
        </div>
      </div>
      <IconButton
        icon="x"
        label={t("day.androidBanner.dismiss")}
        variant="bare"
        size="sm"
        onClick={() => {
          void setDismissed(true);
        }}
      />
    </Card>
  );
});
