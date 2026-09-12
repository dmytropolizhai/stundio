import { useEffect, useState } from "react";
import { checkForUpdate, type UpdateCheckResult } from "../../lib/version/index.ts";

const OWNER = "dmytropolizhai";
const REPO = "stundio";

/**
 * One check per app open (CLAUDE.md: don't poll) — no retry loop, no background timer.
 * `null` covers both "still checking" and "nothing to report" (offline, up to date, or the
 * check failed); the UI treats those the same and just shows nothing.
 */
export const useUpdateCheck = (): UpdateCheckResult | null => {
  const [result, setResult] = useState<UpdateCheckResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void checkForUpdate(__APP_VERSION__, OWNER, REPO).then((outcome) => {
      if (!cancelled) setResult(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return result;
};
