import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { Icon, type IconName } from "./icon.tsx";
import { cn } from "../../lib/utils.ts";

/*
 * Everything in the DS is a pill; nothing is square. Press is a scale change only — the DS is
 * explicit that colour does not change on press, and hover (desktop previews only) is a tint.
 * The published component drives the press with inline pointer handlers; `active:` does it
 * declaratively and survives being interrupted by a scroll, which the JS version does not.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center rounded-pill font-text font-semibold",
    "cursor-pointer border-0 whitespace-nowrap select-none",
    "transition-[background-color,color,box-shadow,transform] duration-(--dur-fast) ease-(--ease-standard)",
    "active:scale-(--press-scale) active:duration-(--dur-instant)",
    "disabled:pointer-events-none disabled:opacity-38",
  ],
  {
    variants: {
      variant: {
        primary: "bg-brand text-on-brand shadow-card hover:bg-ink-700 dark:hover:bg-ink-200",
        inverse: "bg-brand text-on-brand shadow-card hover:bg-ink-700 dark:hover:bg-ink-200",
        outline: "bg-transparent text-strong inset-ring-2 inset-ring-strong hover:bg-sunken",
        ghost: "bg-transparent text-strong hover:bg-sunken",
        onBrand: "bg-white text-strong hover:bg-ink-050",
        danger: "bg-danger text-white shadow-card hover:opacity-90 active:opacity-100",
      },
      size: {
        sm: "h-9 gap-1.5 px-4 text-caption",
        md: "h-11 gap-2 px-5 text-body",
        lg: "h-[54px] gap-2.5 px-[26px] text-[16px]",
      },
      block: { true: "flex w-full", false: "inline-flex w-auto" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

/** Icon size is tied to the button size, per the DS spec table. */
const ICON_SIZE = { sm: 16, md: 18, lg: 20 } as const;

export type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "color"> &
  VariantProps<typeof buttonVariants> & {
    icon?: IconName;
    iconEnd?: IconName;
    /** Render as the child element (shadcn `asChild`), e.g. to make a link look like a button. */
    asChild?: boolean;
  };

export const Button = ({
  className,
  variant,
  size,
  block,
  icon,
  iconEnd,
  asChild = false,
  children,
  type = "button",
  ...props
}: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  const glyph = ICON_SIZE[size ?? "md"];
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    >
      {icon !== undefined && <Icon name={icon} size={glyph} />}
      <Slottable>{children}</Slottable>
      {iconEnd !== undefined && <Icon name={iconEnd} size={glyph} />}
    </Comp>
  );
};
