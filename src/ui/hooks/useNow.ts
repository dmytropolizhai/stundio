/**
 * A Riga wall clock that ticks once a minute, aligned to the minute boundary.
 *
 * A per-second interval would repaint the "now" marker sixty times for one visible change;
 * the day screen only ever shows whole minutes.
 */
import { useEffect, useState } from "react";
import { rigaClock, type RigaClock } from "../../lib/schedule/index.ts";

export const useNow = (): RigaClock => {
  const [now, setNow] = useState<RigaClock>(() => rigaClock());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(rigaClock());
      // Re-align every time: a device waking from sleep must not stay a half-minute off.
      timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
    };
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return now;
};
