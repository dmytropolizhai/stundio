import { useRef, type KeyboardEvent } from "react";
import { cn } from "../../lib/utils.ts";
import { Icon } from "./icon.tsx";

export type ThemePreview = "light" | "dark" | "split";

export type ThemePickerOption<K extends string = string> = {
  key: K;
  label: string;
  /** Which theme the thumbnail is drawn in; `split` is half of each, for "follow the system". */
  preview: ThemePreview;
};

export type ThemePickerProps<K extends string = string> = {
  options: readonly ThemePickerOption<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Accessible name of the group. */
  label: string;
  "aria-describedby"?: string;
  className?: string;
};

/**
 * A tiny screen drawn with the real tokens: ground, a glance panel with its lamp mark, two rows.
 * `force-light` / `force-dark` re-declare the theme tokens on the thumbnail itself (the token files
 * scope them to both `:root` and these classes), so each thumbnail shows its own theme whatever the
 * app is set to — a picture of Night would go stale the day Night changes.
 */
const MiniScreen = () => (
  <svg
    viewBox="0 0 100 86"
    width="100%"
    height="100%"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <rect width="100" height="86" style={{ fill: "var(--bg-app)" }} />
    <rect x="12" y="12" width="76" height="26" rx="8" style={{ fill: "var(--surface-panel)" }} />
    <rect x="18" y="26" width="18" height="6" rx="3" style={{ fill: "var(--lamp-mark)" }} />
    <rect x="12" y="44" width="76" height="12" rx="6" style={{ fill: "var(--surface-card)" }} />
    <rect x="12" y="60" width="76" height="12" rx="6" style={{ fill: "var(--surface-card)" }} />
  </svg>
);

const Preview = ({ kind }: { kind: ThemePreview }) =>
  kind === "split" ? (
    <>
      <span className="force-light absolute inset-0" style={{ clipPath: "inset(0 50% 0 0)" }}>
        <MiniScreen />
      </span>
      <span className="force-dark absolute inset-0" style={{ clipPath: "inset(0 0 0 50%)" }}>
        <MiniScreen />
      </span>
    </>
  ) : (
    <span className={cn("absolute inset-0", kind === "dark" ? "force-dark" : "force-light")}>
      <MiniScreen />
    </span>
  );

/**
 * Pick one theme from three thumbnails (the design system's ThemePicker). The chosen one gets a 2px
 * ink ring and a check. A radio group: arrow keys move the choice, and only the chosen thumbnail is
 * in the tab order.
 */
export const ThemePicker = <K extends string>({
  options,
  value,
  onChange,
  label,
  "aria-describedby": describedBy,
  className,
}: ThemePickerProps<K>) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (index: number, step: 1 | -1) => {
    const next = options[(index + step + options.length) % options.length];
    if (next === undefined) return;
    onChange(next.key);
    refs.current[options.indexOf(next)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(index, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(index, -1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      {...(describedBy === undefined ? {} : { "aria-describedby": describedBy })}
      className={cn("grid grid-cols-3 gap-3 p-4", className)}
    >
      {options.map((option, index) => {
        const checked = option.key === value;
        return (
          <button
            key={option.key}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => {
              onChange(option.key);
            }}
            onKeyDown={(event) => {
              onKeyDown(event, index);
            }}
            className={cn(
              "group grid cursor-pointer justify-items-center gap-2.5 rounded-sm border-0 bg-transparent p-0",
              "font-text text-caption font-medium text-strong",
              "active:scale-(--press-scale) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--focus-ring)",
            )}
          >
            <span
              className={cn(
                "relative block aspect-[1/0.86] w-full overflow-hidden rounded-sm",
                checked
                  ? "ring-2 ring-strong ring-offset-2 ring-offset-card"
                  : "inset-ring-1 inset-ring-hairline",
              )}
            >
              <Preview kind={option.preview} />
              {checked && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1.5 left-1.5 grid size-[22px] place-items-center rounded-full bg-inverse text-on-inverse"
                >
                  <Icon name="check" size={14} />
                </span>
              )}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
