import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Icon } from "./icon.tsx";
import { cn } from "../../lib/utils.ts";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectFieldProps = Omit<
  ComponentPropsWithoutRef<"select">,
  "onChange" | "value" | "className" | "children"
> & {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  className?: string;
};

/**
 * Pill select.
 *
 * Deliberately a native `<select>`, matching the DS, rather than the Radix Select a shadcn build
 * would normally reach for: on Android the native element opens the OS picker, which is the right
 * control on a touch device and keeps working when JS is busy. A custom listbox would be a
 * downgrade here. `appearance-none` plus the DS chevron carries the styling.
 */
export const SelectField = ({
  label,
  value,
  onChange,
  options,
  className,
  ...props
}: SelectFieldProps) => (
  <label className={cn("flex flex-col gap-1.5", className)}>
    {label !== undefined && <span className="u-eyebrow">{label}</span>}
    <span className="relative flex h-13 items-center rounded-pill bg-card px-4.5 shadow-hairline has-[:focus-visible]:inset-ring-2 has-[:focus-visible]:inset-ring-focus">
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className={cn(
          "flex-1 cursor-pointer appearance-none border-0 bg-transparent outline-none",
          "font-text text-body font-bold text-strong",
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size={18} className="text-muted" />
    </span>
  </label>
);
