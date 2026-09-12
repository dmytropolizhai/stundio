import { useCallback, useEffect, useRef, useState } from "react";
import { checkForUpdate, type UpdateCheckResult } from "@/lib/version";

const OWNER = "dmytropolizhai";
const REPO = "stundio";

/**
 * One automatic check per app open (CLAUDE.md: don't poll) — no retry loop, no background
 * timer. `recheck` exists only for the user-initiated "check for updates" button in Settings;
 * it does not start any polling on its own. `result` is `null` for both "still checking" and
 * "nothing to report" (offline, up to date, or the check failed); `checked` distinguishes a
 * completed check with nothing to report from one that hasn't run yet, so a manual check can
 * say "up to date" instead of showing nothing.
 */
export const useUpdateCheck = (): {
  result: UpdateCheckResult | null;
  checking: boolean;
  checked: boolean;
  recheck: () => void;
} => {
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [checked, setChecked] = useState(false);
  /**
   * A per-call token rather than a single sticky "cancelled" flag: StrictMode's dev-only
   * mount→cleanup→mount double-invoke would otherwise set a shared flag to `true` once and
   * leave it there, so every check afterwards — including a later manual `recheck()` — bailed
   * out silently and `checking` never returned to `false`.
   */
  const requestIdRef = useRef(0);

  const run = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setChecking(true);
    void checkForUpdate(__APP_VERSION__, OWNER, REPO).then((outcome) => {
      if (requestIdRef.current !== requestId) return;
      setResult(outcome);
      setChecking(false);
      setChecked(true);
    });
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return { result, checking, checked, recheck: run };
};
