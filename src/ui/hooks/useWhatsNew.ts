import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { entriesSince, entriesUpTo } from "@/lib/version";
import { CHANGELOG, type ChangelogEntry } from "@/ui/i18n";

export type WhatsNew = {
  /** Auto-opens once per update; also true while the user has it open from Settings. */
  open: boolean;
  /** Releases the user hasn't read yet — rendered expanded, above the rest of the history. */
  unread: ChangelogEntry[];
  /** Every entry the installed build knows about, newest first. */
  history: ChangelogEntry[];
  show: () => void;
  dismiss: () => void;
};

/**
 * Decides whether the what's-new sheet opens on launch, and marks the notes read when it is
 * dismissed. The "which entries" question is pure and lives in `lib/version/changelog.ts`.
 *
 * The silent-mark branch is the part that is easy to get wrong: an install that has never
 * been marked (a fresh install, or the first launch after the release that added this
 * feature) shows nothing, but must still record the current version — otherwise the baseline
 * stays `null` forever and no future update ever announces itself.
 */
export const useWhatsNew = (): WhatsNew => {
  const ready = useAppStore((s) => s.ready);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const lastSeen = useAppStore((s) => s.settings.lastSeenChangelogVersion);
  const setLastSeenChangelogVersion = useAppStore((s) => s.setLastSeenChangelogVersion);

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState<ChangelogEntry[]>([]);
  /**
   * The effect re-runs when `dismiss` persists the new `lastSeen`, and the store update lands
   * a tick after the sheet closes. Without this the stale `lastSeen` would re-open the sheet
   * the user just dismissed. One auto-open per launch is the whole rule.
   */
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    // Onboarding owns the screen until a class is picked; a sheet over it would be noise.
    if (!ready || selectedClassId === null || autoOpenedRef.current) return;

    if (lastSeen === null) {
      autoOpenedRef.current = true;
      void setLastSeenChangelogVersion(__APP_VERSION__);
      return;
    }
    const fresh = entriesSince(CHANGELOG, lastSeen, __APP_VERSION__);
    if (fresh.length === 0) return;
    autoOpenedRef.current = true;
    setUnread(fresh);
    setOpen(true);
  }, [ready, selectedClassId, lastSeen, setLastSeenChangelogVersion]);

  const dismiss = useCallback(() => {
    setOpen(false);
    setUnread([]);
    if (lastSeen !== __APP_VERSION__) void setLastSeenChangelogVersion(__APP_VERSION__);
  }, [lastSeen, setLastSeenChangelogVersion]);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  const history = useMemo(() => entriesUpTo(CHANGELOG, __APP_VERSION__), []);

  return { open, unread, history, show, dismiss };
};
