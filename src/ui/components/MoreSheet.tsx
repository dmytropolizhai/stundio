/**
 * Overflow sheet opened from the phone bottom bar's "More" slot. Holds the identity-picker row
 * (replacing the old top-bar `ClassBadge` action) followed by the personal destinations
 * (Subjects, Transit, Settings).
 */
import { BottomSheet, cn, Icon } from "@/ds";
import { matchPersona } from "@/lib/persona";
import { useT } from "@/ui/i18n";
import { usePersona, type Tab } from "@/ui/persona";
import { useBackButton } from "@/ui/hooks/useBackButton.ts";
import { useSelectedClass } from "@/ui/hooks/useClasses.ts";
import { useSelectedTeacher } from "@/ui/hooks/useTeachers.ts";
import type { NavItem } from "./nav-items.ts";

type MoreSheetProps = {
  open: boolean;
  onClose: () => void;
  items: readonly NavItem[];
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
  onPickIdentity: () => void;
};

export const MoreSheet = ({
  open,
  onClose,
  items,
  activeTab,
  onSelect,
  onPickIdentity,
}: MoreSheetProps) => {
  const t = useT();
  const { identity, profile } = usePersona();
  const selectedClass = useSelectedClass();
  const selectedTeacher = useSelectedTeacher();

  // Priority 20: closes the sheet before the shell's picker (15) and "back to Home" (5) handlers.
  useBackButton(
    () => {
      onClose();
      return true;
    },
    { enabled: open, priority: 20 },
  );

  const identityValue = matchPersona<string | undefined>(identity, {
    student: () => selectedClass?.short,
    teacher: () => selectedTeacher?.short,
  });

  return (
    <BottomSheet open={open} onClose={onClose} title={t("nav.more")} label={t("nav.more.label")}>
      <div className="flex flex-col gap-2 pb-1">
        <button
          type="button"
          data-testid="more-identity-row"
          aria-label={t(profile.changeIdentityLabel)}
          onClick={() => {
            onClose();
            onPickIdentity();
          }}
          className={cn(
            "flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-lg bg-sunken px-4 py-3 text-left",
            "transition-colors duration-(--dur-fast) ease-standard active:scale-(--press-scale) active:duration-(--dur-instant)",
          )}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-card text-strong">
              <Icon name={profile.icon} size={18} />
            </span>
            <span className="min-w-0">
              <span className="block font-text text-caption text-muted">
                {t(profile.subjectLabel)}
              </span>
              <span className="block truncate font-text text-body font-bold text-strong">
                {identityValue ?? t("settings.change")}
              </span>
            </span>
          </span>
          <Icon name="chevron-right" size={18} className="shrink-0 text-muted" />
        </button>

        <div className="mt-1 flex flex-col gap-1" role="list">
          {items.map((item) => {
            const active = item.key === activeTab;
            return (
              <button
                key={item.key}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  onSelect(item.key);
                  onClose();
                }}
                className={cn(
                  "flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-4 py-3 text-left font-text text-body",
                  "transition-colors duration-(--dur-fast) ease-standard active:scale-(--press-scale) active:duration-(--dur-instant)",
                  active
                    ? "bg-lamp font-semibold text-lamp-ink"
                    : "bg-transparent font-medium text-strong hover:bg-sunken",
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon name={item.icon} size={20} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {active && <Icon name="check" size={18} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
};
