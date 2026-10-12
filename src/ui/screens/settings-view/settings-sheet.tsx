/**
 * The pieces every sheet opened from Settings shares: a title that repeats the row's icon tile,
 * the row's description as the sheet's first line, and the single-choice list most rows open.
 */
import type { KeyboardEvent, ReactNode } from "react";
import { BottomSheet, Icon, cn, type IconName } from "@/ds";
import { SheetDescription } from "@/ui/components/SheetDescription.tsx";
import { Tile, type RowTone } from "./settings-row.tsx";

export { SheetDescription };

export const SheetTitle = ({
  icon,
  tone,
  children,
}: {
  icon: IconName;
  tone?: RowTone;
  children: ReactNode;
}) => (
  <span className="flex items-center gap-3">
    <Tile icon={icon} size="lg" {...(tone === undefined ? {} : { tone })} />
    <span className="min-w-0">{children}</span>
  </span>
);

export type ChoiceOption<K extends string> = {
  key: K;
  label: string;
  icon?: IconName;
  /** Muted text on the right of the option, e.g. a language's code. */
  detail?: string;
};

type ChoiceSheetProps<K extends string> = {
  open: boolean;
  onClose: () => void;
  icon: IconName;
  title: string;
  description?: string | undefined;
  options: ChoiceOption<K>[];
  value: K;
  onChange: (value: K) => void;
};

const NEXT_KEYS = new Set(["ArrowDown", "ArrowRight"]);
const PREV_KEYS = new Set(["ArrowUp", "ArrowLeft"]);

/**
 * Roving focus for the radiogroup: arrows, Home and End move between options. Unlike a plain
 * radiogroup they only move focus — a pick commits and closes the sheet, so Space or Enter
 * makes it.
 */
const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
  const radios = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
  const current = radios.indexOf(document.activeElement as HTMLElement);
  const last = radios.length - 1;
  let next: number;
  if (NEXT_KEYS.has(event.key)) next = current >= last ? 0 : current + 1;
  else if (PREV_KEYS.has(event.key)) next = current <= 0 ? last : current - 1;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = last;
  else return;
  event.preventDefault();
  radios[next]?.focus();
};

/** One-of-n picker. A pick commits through the store at once and closes the sheet. */
export const ChoiceSheet = <K extends string>({
  open,
  onClose,
  icon,
  title,
  description,
  options,
  value,
  onChange,
}: ChoiceSheetProps<K>) => {
  // The one tab stop: the current pick, or the first option when nothing matches.
  const tabStop = options.some((option) => option.key === value) ? value : options[0]?.key;
  return (
    <BottomSheet open={open} onClose={onClose} title={<SheetTitle icon={icon}>{title}</SheetTitle>}>
      {description !== undefined && <SheetDescription>{description}</SheetDescription>}
      <div
        role="radiogroup"
        aria-label={title}
        onKeyDown={moveFocus}
        className="flex flex-col pb-1"
      >
        {options.map((option) => {
          const checked = option.key === value;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={option.key === tabStop ? 0 : -1}
              onClick={() => {
                onChange(option.key);
                onClose();
              }}
              className="flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-md border-0 bg-transparent px-1.5 text-left active:bg-sunken"
            >
              {option.icon !== undefined && <Tile icon={option.icon} />}
              <span
                className={cn(
                  "min-w-0 flex-1 font-text text-body text-strong",
                  checked ? "font-extrabold" : "font-semibold",
                )}
              >
                {option.label}
              </span>
              {option.detail !== undefined && (
                <span className="font-text text-caption font-semibold text-muted">
                  {option.detail}
                </span>
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-pill",
                  checked ? "bg-brand text-on-brand" : "inset-ring-2 inset-ring-strong-border",
                )}
              >
                {checked && <Icon name="check" size={14} />}
              </span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
};
