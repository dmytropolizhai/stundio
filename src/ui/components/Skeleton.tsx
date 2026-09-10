import { Skeleton } from "../../ds/index.ts";

/**
 * Cold-open placeholder. Shaped like the lesson list it replaces so the first paint does not
 * jump when the cache arrives a frame later — hence the card radius and height, not a bare bar.
 */
export const DaySkeleton = ({ rows = 5 }: { rows?: number }) => (
  <ul className="flex flex-col gap-3 px-gutter py-4" aria-hidden="true" data-testid="day-skeleton">
    {Array.from({ length: rows }, (_, i) => (
      <li key={i}>
        <Skeleton
          height={92}
          radius="var(--radius-xl)"
          style={{ animationDelay: `${String(i * 60)}ms` }}
        />
      </li>
    ))}
  </ul>
);
