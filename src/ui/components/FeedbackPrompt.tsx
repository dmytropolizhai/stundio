import { useAppStore } from "@/store";
import { Button, Card, IconButton } from "@/ds";
import { useSelectedClass } from "../hooks/useClasses.ts";
import { suggestFeatureUrl } from "@/ui/feedback.ts";
import { useT } from "@/ui/i18n";

/**
 * Home-screen nudge for feedback: appears once the app has been opened more than 3 times and
 * the user hasn't closed it. Closing it is per-device only — Settings keeps its own "suggest a
 * feature" row (`SettingsView`) reachable regardless, so closing this card never loses the
 * ability to send one.
 */
export const FeedbackPrompt = () => {
  const t = useT();
  const selectedClass = useSelectedClass();
  const appOpenCount = useAppStore((s) => s.settings.appOpenCount);
  const dismissed = useAppStore((s) => s.settings.feedbackPromptDismissed);
  const setFeedbackPromptDismissed = useAppStore((s) => s.setFeedbackPromptDismissed);

  if (appOpenCount <= 3 || dismissed) return null;

  return (
    <Card
      tone="sunken"
      radius="lg"
      elevation="none"
      className="mb-3 flex items-start gap-3 p-4"
      data-testid="feedback-prompt"
    >
      <div className="min-w-0 flex-1">
        <p className="font-text text-body font-bold text-strong">{t("day.feedbackPrompt.title")}</p>
        <p className="mt-0.5 font-text text-caption text-muted">{t("day.feedbackPrompt.body")}</p>
        <Button size="sm" icon="plus" asChild className="mt-3">
          <a href={suggestFeatureUrl(selectedClass?.short)} target="_blank" rel="noreferrer">
            {t("day.feedbackPrompt.action")}
          </a>
        </Button>
      </div>
      <IconButton
        icon="x"
        label={t("day.feedbackPrompt.dismiss")}
        variant="bare"
        size="sm"
        onClick={() => {
          void setFeedbackPromptDismissed(true);
        }}
      />
    </Card>
  );
};
