type DayNowMarkerProps = {
  label: string;
};

/** Luminous warm-lamp liquid-glass timeline horizon shown between slabs when no lesson is live. */
export const DayNowMarker = ({ label }: DayNowMarkerProps) => (
  <div className="flex items-center gap-2.5 px-2 py-0.5" data-testid="now-marker">
    <span
      aria-hidden="true"
      className="size-2 shrink-0 rounded-pill bg-lamp-mark shadow-[0_2px_8px_var(--lamp-glow)] dark:bg-lamp"
    />
    <span
      aria-hidden="true"
      className="h-px flex-1 bg-gradient-to-r from-lamp-mark/70 via-lamp-mark/25 to-transparent dark:from-lamp/75 dark:via-lamp/25"
    />
    <span className="u-schedule-glass-live inline-flex items-center rounded-pill px-2.5 py-0.5 font-text text-micro font-bold tracking-label text-lamp-text uppercase">
      {label}
    </span>
  </div>
);
