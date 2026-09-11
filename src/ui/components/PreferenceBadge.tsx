import { useState } from "react";
import { Chip, Switch } from "../../ds/index.ts";
import { Sheet } from "./Sheet.tsx";
import { useT } from "../i18n/index.ts";

/**
 * "⚙" — opens the display-preferences sheet. Sits in `TopBar`'s `actions` slot alongside
 * `SyncBadge`/`ClassBadge` (day.tsx), the tappable counterpart for settings that are too
 * lightweight to earn a row in the full `SettingsView` but still need a home off the toolbar.
 */
export const PreferenceBadge = ({
  showTime,
  onShowTimeChange,
}: {
  showTime: boolean;
  onShowTimeChange: (value: boolean) => void;
}) => {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Chip
        icon="settings"
        onClick={() => {
          setOpen(true);
        }}
        aria-label={t("day.preferences")}
        data-testid="preference-badge"
      />

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title={t("day.preferences")}
      >
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="font-text text-body text-strong">{t("day.showTime")}</span>
          <Switch checked={showTime} onChange={onShowTimeChange} aria-label={t("day.showTime")} />
        </div>
      </Sheet>
    </>
  );
};
