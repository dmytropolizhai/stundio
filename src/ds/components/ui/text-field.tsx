import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Icon, type IconName } from "./icon.tsx";
import { cn } from "../../lib/utils.ts";

export type TextFieldProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "onChange" | "value" | "type" | "className"
> & {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: IconName;
  hint?: ReactNode;
  invalid?: boolean;
  type?: "text" | "search" | "email" | "tel" | "url";
  className?: string;
};

/**
 * Pill input with an optional leading icon.
 *
 * `invalid` swaps the hairline for a 2px danger ring — the DS uses inset rings on white-on-white
 * inputs rather than borders, which is the one exception to "no inner shadows anywhere".
 * The hint doubles as the error message and is wired up with `aria-describedby`.
 */
export const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  icon,
  hint,
  invalid = false,
  type = "text",
  className,
  ...props
}: TextFieldProps) => {
  const hintId = useId();
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      {label !== undefined && <span className="u-eyebrow">{label}</span>}
      <span
        className={cn(
          "flex h-13 items-center gap-2.5 rounded-pill bg-card px-4.5 text-muted",
          /* An invalid field still has to show focus, so the danger ring keeps its width and
             only yields its colour while the input is focused. */
          invalid
            ? "inset-ring-2 inset-ring-danger has-[:focus-visible]:inset-ring-focus"
            : "shadow-hairline has-[:focus-visible]:inset-ring-2 has-[:focus-visible]:inset-ring-focus",
        )}
      >
        {icon !== undefined && <Icon name={icon} size={18} />}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          aria-invalid={invalid}
          {...(hint === undefined ? {} : { "aria-describedby": hintId })}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent outline-none",
            "font-text text-body text-strong placeholder:text-muted",
          )}
          {...props}
        />
      </span>
      {hint !== undefined && (
        <span
          id={hintId}
          className={cn("font-text text-caption", invalid ? "text-danger" : "text-muted")}
        >
          {hint}
        </span>
      )}
    </label>
  );
};
