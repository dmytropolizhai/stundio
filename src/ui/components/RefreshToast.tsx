import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/store";
import { Icon } from "@/ds";
import { useT } from "@/ui/i18n";

export const TOAST_MS = 2200;

/**
 * "Updated" confirmation after a manual refresh that landed cleanly (pull-to-refresh, the top-bar
 * button, Settings). The badge only changes colour, which is easy to miss after a pull, so this
 * says it out loud for a moment.
 *
 * A deliberate, documented deviation from DESIGN.md's "no Toast": it is non-modal, takes no
 * input, never stacks (a new refresh just restarts the timer), and carries nothing that is not
 * also in the freshness badge. Failures are not announced here — the badge already turns red.
 */
export const RefreshToast = () => {
  const t = useT();
  const count = useAppStore((s) => s.manualRefreshCount);
  const seen = useRef(count);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (count === seen.current) return;
    seen.current = count;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, TOAST_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [count]);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-gutter"
      style={{ bottom: "calc(var(--nav-height) + var(--nav-inset) + 12px)" }}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {visible ? (
          <motion.div
            key="toast"
            data-testid="refresh-toast"
            className="flex items-center gap-2 rounded-pill bg-card px-4 py-2 font-text text-caption font-bold text-strong shadow-raised"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <Icon name="check" size={16} className="text-success" />
            {t("sync.toast")}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
