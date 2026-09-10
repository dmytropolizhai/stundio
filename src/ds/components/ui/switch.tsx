import * as RadixSwitch from "@radix-ui/react-switch";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils.ts";

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
  /** Accessible name when `label` is absent or not a plain string. */
  "aria-label"?: string;
};

/**
 * 50×30 track, 24px thumb, brand fill when on.
 *
 * Radix supplies the real `role="switch"` semantics, label association and keyboard handling; the
 * published component hand-rolls all three on a `<span>`. The thumb travel is one of the two
 * places the spring easing is allowed.
 *
 * Dark: the DS off-track is `--ink-200`, a fixed light step, which would glow on a dark surface —
 * so the off state darkens under `.dark` while the on state (brand) is unchanged.
 */
export const Switch = ({
  checked,
  onChange,
  label,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: SwitchProps) => {
  const control = (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      {...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel })}
      className={cn(
        "relative h-[30px] w-[50px] shrink-0 cursor-pointer rounded-pill border-0",
        "bg-ink-200 dark:bg-ink-700",
        "data-[state=checked]:bg-brand",
        "transition-colors duration-(--dur-fast) ease-(--ease-standard)",
        "disabled:cursor-not-allowed",
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          "block size-6 translate-x-[3px] rounded-pill bg-white",
          "shadow-[0_2px_6px_rgba(6,11,61,.24)]",
          "transition-transform duration-(--dur-fast) ease-(--ease-spring)",
          "data-[state=checked]:translate-x-[23px]",
        )}
      />
    </RadixSwitch.Root>
  );

  if (label === undefined) {
    return <div className={cn("inline-flex", disabled && "opacity-38", className)}>{control}</div>;
  }
  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 font-text text-body text-strong",
        disabled ? "cursor-not-allowed opacity-38" : "cursor-pointer",
        className,
      )}
    >
      {control}
      {label}
    </label>
  );
};
