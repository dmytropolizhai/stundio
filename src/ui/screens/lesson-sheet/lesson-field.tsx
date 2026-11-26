import { Icon, cn, type IconName } from "@/ds";

type LessonFieldProps = {
  label: string;
  value: string;
  was?: string | undefined;
  /** Localized screen-reader prefix for the previous value when a field changed (e.g. "Bija"). */
  wasLabel?: string | undefined;
  icon?: IconName | undefined;
  /** Formats numeric/code values (period, room) in Martian Mono tabular figures. */
  mono?: boolean | undefined;
  /** Renders the current value inside the Home screen's recessed liquid-glass room capsule. */
  capsule?: boolean | undefined;
};

export const LessonField = ({
  label,
  value,
  was,
  wasLabel,
  icon,
  mono = false,
  capsule = false,
}: LessonFieldProps) => {
  const hasWas = was !== undefined && was !== "" && was !== value;
  if (value === "" && !hasWas) return null;

  const valueNode =
    capsule && value !== "" ? (
      <span className="u-schedule-room-pill inline-flex max-w-full items-center truncate rounded-pill px-2.5 py-0.5 font-data text-caption font-semibold tabular-nums text-strong">
        {value}
      </span>
    ) : (
      <span>{value}</span>
    );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-3",
        hasWas && "bg-[color-mix(in_oklab,var(--status-warning)_8%,transparent)]",
      )}
    >
      <dt className="flex shrink-0 items-center gap-2 font-text text-caption text-muted">
        {icon !== undefined && <Icon name={icon} size={15} className="text-muted/80" />}
        <span>{label}</span>
      </dt>
      <dd
        className={cn(
          "min-w-0 text-right",
          mono
            ? "font-data text-caption font-semibold tabular-nums text-strong"
            : "font-text text-caption font-bold text-strong",
        )}
      >
        {hasWas ? (
          <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
            <span className="font-normal text-muted line-through opacity-75">
              {wasLabel !== undefined && <span className="sr-only">{wasLabel}: </span>}
              {was}
            </span>
            {value !== "" && (
              <>
                <span className="sr-only">, </span>
                <Icon name="arrow-right" size={13} className="shrink-0 text-muted" />
                {valueNode}
              </>
            )}
          </span>
        ) : (
          valueNode
        )}
      </dd>
    </div>
  );
};
