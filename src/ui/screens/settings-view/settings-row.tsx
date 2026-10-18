/**
 * The settings screen's one row shape: `[tile] label + description … value [switch | ›]`.
 *
 * Every row leads with a 32px icon tile, so the left edge of the screen reads as a column of
 * glyphs a student can scan without reading; the current value sits on the right so the state is
 * visible without opening anything; the trailing control says what a tap does (a switch flips in
 * place, a chevron opens a sheet). The description under the label is the same sentence the
 * row's sheet opens with (`SheetDescription`), so the two never drift apart.
 *
 * Tiles are neutral on purpose: the six pastel accents belong to subjects (DESIGN.md, The Index
 * Rule), so colour appears here only as status — the danger tile of a destructive row, the red
 * wash of a row that reports something broken.
 */
import { useId, type ReactNode } from "react";
import { Icon, Switch, cn, type IconName } from "@/ds";

export type RowTone = "default" | "danger" | "alert";

type TileProps = {
  icon: IconName;
  tone?: RowTone;
  size?: "md" | "lg";
};

export const Tile = ({ icon, tone = "default", size = "md" }: TileProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex shrink-0 items-center justify-center rounded-squircle",
      size === "md" ? "size-8" : "size-10",
      tone === "default" && "text-strong",
      tone === "danger" && "text-danger",
      tone === "alert" && "text-danger/12",
    )}
  >
    <Icon name={icon} size={size === "md" ? 18 : 20} />
  </span>
);

type BaseProps = {
  icon: IconName;
  label: string;
  description?: string | undefined;
  /** The current state, shown before the trailing control: "10 min", "LV", a status dot. */
  value?: ReactNode;
  tone?: RowTone;
};

type ToggleRowProps = BaseProps & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

type ActionRowProps = BaseProps & {
  onClick: () => void;
  /** Greys the row out and drops taps, e.g. Sync while a sync is already running. */
  disabled?: boolean;
  /** Replaces the chevron, e.g. a refresh glyph for a row that acts instead of opening. */
  trailing?: ReactNode;
};

type StaticRowProps = BaseProps & {
  /** An interactive control of its own (a button), so the row itself stays a plain container. */
  trailing?: ReactNode;
};

export type SettingsRowProps = ToggleRowProps | ActionRowProps | StaticRowProps;

const ROW =
  "relative flex min-h-14 w-full items-center gap-3 border-0 bg-transparent py-2.5 pr-4 pl-3 text-left " +
  "not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-14 " +
  "not-first:before:h-px not-first:before:bg-hairline";

const PRESSABLE =
  "cursor-pointer transition-colors duration-(--dur-fast) ease-(--ease-standard) active:bg-sunken";

export const SettingsRow = (props: SettingsRowProps) => {
  const { icon, label, description, value, tone = "default" } = props;
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const descriptionId = description === undefined ? undefined : `${id}-description`;

  // The value shares the label's line, so a long value ("Automātiski") never squeezes the
  // description into a narrow column; the description runs the full width underneath.
  const body = (
    <>
      <Tile icon={icon} tone={tone} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-3">
          <span
            id={labelId}
            className={cn(
              "min-w-0 flex-1 font-text text-body leading-snug font-bold",
              tone === "default" ? "text-strong" : "text-danger",
            )}
          >
            {label}
          </span>
          {value !== undefined && (
            <span
              id={valueId}
              className="flex max-w-[55%] shrink-0 items-center gap-1.5 self-center font-text text-caption font-semibold text-muted tabular-nums"
            >
              {value}
            </span>
          )}
        </span>
        {description !== undefined && (
          <span id={descriptionId} className="mt-0.5 font-text text-caption text-muted">
            {description}
          </span>
        )}
      </span>
    </>
  );

  if ("checked" in props) {
    return (
      // The label forwards a tap anywhere on the row to the switch, so the target is the row.
      <label className={cn(ROW, PRESSABLE)}>
        {body}
        <Switch
          aria-label={label}
          {...(descriptionId === undefined ? {} : { "aria-describedby": descriptionId })}
          checked={props.checked}
          onChange={props.onCheckedChange}
        />
      </label>
    );
  }

  if ("onClick" in props) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        disabled={props.disabled}
        aria-labelledby={value === undefined ? labelId : `${labelId} ${valueId}`}
        aria-describedby={descriptionId}
        className={cn(
          ROW,
          props.disabled === true ? "cursor-default opacity-60" : PRESSABLE,
          tone === "danger" ? "bg-danger/12" : "bg-transparent",
        )}
      >
        {body}
        <span aria-hidden="true" className="flex shrink-0 items-center text-muted">
          {props.trailing ?? <Icon name="chevron-right" size={18} />}
        </span>
      </button>
    );
  }

  return (
    <div className={ROW}>
      {body}
      {props.trailing}
    </div>
  );
};

/** The status dot a value carries: sync state, an update waiting. Status colours only. */
export const StatusDot = ({ tone }: { tone: "success" | "warning" | "danger" | "offline" }) => (
  <span
    aria-hidden="true"
    className={cn(
      "inline-block size-2 shrink-0 rounded-pill",
      tone === "success" && "bg-success",
      tone === "warning" && "bg-warning",
      tone === "danger" && "bg-danger",
      tone === "offline" && "bg-offline",
    )}
  />
);

/** A small near-black pill for "something new here" — a version waiting, unseen notes. */
export const ValueBadge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex h-5.5 items-center rounded-pill bg-brand px-2 font-text text-micro font-extrabold text-on-brand">
    {children}
  </span>
);
