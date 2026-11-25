/**
 * Fixed read-only status strip at the top of the phone shell: shows whose schedule is active on
 * the left and sync freshness on the right, with zero interactive controls (class switching lives
 * in `MoreSheet`, manual refresh is pull-to-refresh). Wide layouts do not mount this bar.
 */
import { cn, Icon, type IconName, type SyncState } from "@/ds";
import { matchPersona } from "@/lib/persona";
import { usePersona } from "@/ui/persona";
import { useSelectedClass } from "@/ui/hooks/useClasses.ts";
import { useSelectedTeacher } from "@/ui/hooks/useTeachers.ts";
import { useSyncSummary } from "@/ui/hooks/useSyncSummary.ts";

/** "Surname Firstname" → "F. Surname" — keeps the narrow status bar from truncating names. */
const teacherShortLabel = (short: string): string => {
  const [surname = "", firstName = ""] = short.trim().split(/\s+/);
  return surname ? `${firstName[0]?.toUpperCase() || ""}. ${surname}` : firstName;
};

const SYNC_ICON: Record<SyncState, { icon: IconName; className: string }> = {
  synced: { icon: "check", className: "text-success" },
  syncing: { icon: "refresh-cw", className: "animate-spin text-strong" },
  offline: { icon: "wifi-off", className: "text-offline" },
  failed: { icon: "triangle-alert", className: "text-danger" },
};

export const StatusBar = () => {
  const { identity, profile } = usePersona();
  const selectedClass = useSelectedClass();
  const selectedTeacher = useSelectedTeacher();
  const { state, label: syncLabel } = useSyncSummary();

  const identityLabel = matchPersona<string | undefined | null>(identity, {
    student: () => selectedClass?.short,
    teacher: () => (selectedTeacher?.short ? teacherShortLabel(selectedTeacher.short) : null),
  });

  const syncVisual = SYNC_ICON[state];

  return (
    <div data-testid="status-bar" className="pointer-events-none fixed inset-x-0 top-0 z-30">
      <div className="bg-app pt-(--app-inset-top)">
        <div className="mx-auto flex h-(--status-bar-height) w-full max-w-screen items-center justify-between gap-3 px-gutter">
          <span className="flex min-w-0 items-center gap-1.5 font-text text-caption font-semibold text-strong">
            <Icon name={profile.icon} size={14} className="shrink-0 text-muted" />
            <span className="truncate">{identityLabel ?? ""}</span>
          </span>

          <div
            role="status"
            aria-live="polite"
            className="flex min-w-0 items-center gap-1.5 font-text text-caption text-muted"
          >
            <Icon
              name={syncVisual.icon}
              size={14}
              className={cn("shrink-0", syncVisual.className)}
            />
            <span className="truncate">{syncLabel}</span>
          </div>
        </div>
      </div>
      {/* Soft fade-out edge so scrolling content dissolves cleanly under the fixed strip. */}
      <div aria-hidden="true" className="h-3 bg-gradient-to-b from-app to-transparent" />
    </div>
  );
};
