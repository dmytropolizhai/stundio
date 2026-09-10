/**
 * Cold-open placeholder. Shaped like the lesson list it replaces so the first paint does not
 * jump when the cache arrives a frame later.
 */
export const DaySkeleton = ({ rows = 5 }: { rows?: number }) => (
  <ul className="flex flex-col gap-2 p-4" aria-hidden="true" data-testid="day-skeleton">
    {Array.from({ length: rows }, (_, i) => (
      <li
        key={i}
        className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        style={{ animationDelay: `${i * 60}ms` }}
      />
    ))}
  </ul>
);
