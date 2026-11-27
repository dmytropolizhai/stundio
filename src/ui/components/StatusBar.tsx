/**
 * Fixed read-only status strip at the top of the phone shell: shows sync freshness (whose schedule is
 * active lives in the Home greeting), with zero interactive controls (class switching lives
 * in `MoreSheet`, manual refresh is pull-to-refresh). Wide layouts do not mount this bar.
 */
import { cn, Icon, type IconName, type SyncState } from "@/ds";
import { useSyncSummary } from "@/ui/hooks/useSyncSummary.ts";

const SYNC_ICON: Record<SyncState, { icon: IconName; className: string }> = {
  synced: { icon: "check", className: "text-success" },
  syncing: { icon: "refresh-cw", className: "animate-spin text-strong" },
  offline: { icon: "wifi-off", className: "text-offline" },
  failed: { icon: "triangle-alert", className: "text-danger" },
};

export const StatusBar = () => {
  const { state, label: syncLabel } = useSyncSummary();

  const syncVisual = SYNC_ICON[state];

  return (
    <div data-testid="status-bar" className="pointer-events-none fixed inset-x-0 top-0 z-30">
      {/* Dissolves into the ambient weather sky while the Home weather tile is expanded. */}
      <div
        aria-hidden="true"
        data-status-bar-bg=""
        className="pointer-events-none absolute inset-0 transition-opacity duration-(--dur-slow) ease-(--ease-standard)"
      >
        <div className="h-[calc(var(--status-bar-height)+var(--app-inset-top))] bg-app" />
        <div className="h-3 bg-gradient-to-b from-app to-transparent" />
      </div>

      <div className="relative pt-(--app-inset-top)">
        <div className="mx-auto flex h-(--status-bar-height) w-full max-w-screen items-center justify-end gap-3 px-gutter">
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
            {/* The quiet "Updated 14:32" is a courtesy, so it is visually hidden (still announced). */}
            <span className={cn("truncate", state === "synced" && "sr-only")}>{syncLabel}</span>
          </div>
        </div>
      </div>
      {/* Reserve the fade-skirt height so the wrapper matches the backdrop layer. */}
      <div aria-hidden="true" className="h-3" />
    </div>
  );
};
