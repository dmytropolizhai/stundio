/**
 * The embedded Rīgas Satiksme live map, plus a warning when the connection cannot carry it.
 * Offline comes from the store's `syncStatus`, the app's single connectivity signal; a slow
 * connection is inferred from the frame itself, since only its load time says whether this
 * network can reach saraksti.lv. Coming back online reloads the frame instead of leaving the
 * browser's error page in it.
 */
import { useEffect, useState } from "react";
import { Card, Icon } from "@/ds";
import { useAppStore } from "@/store";
import { useT } from "@/ui/i18n";

const LIVE_MAP_URL = "https://saraksti.lv/#riga/map";
/** Long enough for a normal mobile connection, short enough that a student is still looking. */
export const SLOW_MAP_MS = 8000;

export const LiveMapCard = () => {
  const t = useT();
  const offline = useAppStore((s) => s.syncStatus === "offline");
  // Each return from offline is a fresh load attempt; loaded/slow are tracked per attempt.
  const [attempt, setAttempt] = useState(0);
  const [wasOffline, setWasOffline] = useState(offline);
  if (wasOffline !== offline) {
    setWasOffline(offline);
    if (!offline) setAttempt((n) => n + 1);
  }
  const [loadedAttempt, setLoadedAttempt] = useState<number | null>(null);
  const [slowAttempt, setSlowAttempt] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSlowAttempt(attempt), SLOW_MAP_MS);
    return () => clearTimeout(timer);
  }, [attempt]);

  const slow = !offline && slowAttempt === attempt && loadedAttempt !== attempt;
  const warning = offline ? "transit.live.offline" : slow ? "transit.live.slow" : null;

  return (
    <Card className="mb-4 p-4">
      <h2 className="mb-1 font-display text-title font-semibold text-strong">
        {t("transit.live.title")}
      </h2>
      <p className="mb-3 font-text text-body-sm text-muted">{t("transit.live.description")}</p>
      {warning && (
        <Card
          tone="amber"
          radius="lg"
          elevation="none"
          role="status"
          className="mb-3 flex items-center gap-2 font-text text-caption"
        >
          <Icon name={offline ? "wifi-off" : "triangle-alert"} size={16} className="shrink-0" />
          {t(warning)}
        </Card>
      )}
      <div className="overflow-hidden rounded-2xl bg-sunken shadow-card">
        <iframe
          key={attempt}
          title={t("transit.live.frameTitle")}
          src={LIVE_MAP_URL}
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoadedAttempt(attempt)}
          className="h-[min(58svh,660px)] min-h-[400px] w-full border-0 bg-app"
        />
      </div>
      <p className="mt-2 font-text text-caption text-muted">{t("transit.live.source")}</p>
    </Card>
  );
};
