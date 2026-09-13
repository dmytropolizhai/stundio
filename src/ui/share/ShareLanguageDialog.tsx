import { BottomSheet, Button, Card, Switch } from "@/ds";
import { useAppStore } from "@/store";
import { LANGS, LANG_NAMES, useT, type Lang } from "@/ui/i18n";

/**
 * The one-time "which language should the share be in" prompt — shown before the very first
 * share, gated by `settings.shareLangPromptShown` (`useShareWeek` owns when this opens). Picking
 * a language turns sync off; the switch turns it back on and locks the list to the app language.
 */
export const ShareLanguageDialog = ({ open, onDone }: { open: boolean; onDone: () => void }) => {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const setShareLang = useAppStore((s) => s.setShareLang);
  const setShareLangSyncWithApp = useAppStore((s) => s.setShareLangSyncWithApp);

  const effectiveLang = settings.shareLangSyncWithApp ? settings.lang : settings.shareLang;

  return (
    <BottomSheet
      open={open}
      onClose={onDone}
      title={t("share.language.title")}
      footer={
        <Button block size="lg" onClick={onDone}>
          {t("share.language.continue")}
        </Button>
      }
    >
      <ul className="flex flex-col gap-2.5">
        {LANGS.map((key: Lang) => {
          const active = key === effectiveLang;
          return (
            <li key={key}>
              <Card
                tone="surface"
                radius="lg"
                onClick={() => {
                  if (settings.shareLangSyncWithApp) void setShareLangSyncWithApp(false);
                  void setShareLang(key);
                }}
                className={`flex items-center justify-center border-2 ${
                  active ? "border-brand-strong" : "border-transparent"
                }`}
              >
                <span
                  className={`font-text text-body font-bold ${
                    active ? "text-brand-strong" : "text-strong"
                  }`}
                >
                  {LANG_NAMES[key]}
                </span>
              </Card>
            </li>
          );
        })}
      </ul>

      <label className="mt-4 flex items-center justify-between gap-3">
        <span className="font-text text-caption text-muted">{t("share.language.sync")}</span>
        <Switch
          aria-label={t("share.language.sync")}
          checked={settings.shareLangSyncWithApp}
          onChange={(checked) => {
            void setShareLangSyncWithApp(checked);
          }}
        />
      </label>
    </BottomSheet>
  );
};
