import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils.ts";

/*
 * Cards are white, 28px, unbordered, with a blue-tinted shadow. The six subject-accent tones get
 * *no* shadow — the DS is explicit that the colour is what separates a tinted card from the page,
 * and stacking a shadow under it muddies the tint. Each accent carries its own ink pair so the
 * text on it stays full-contrast.
 */
const cardVariants = cva("transition-transform duration-(--dur-instant) ease-(--ease-out)", {
  variants: {
    tone: {
      surface: "bg-card text-fg",
      sunken: "bg-sunken text-fg",
      brand: "bg-brand text-on-brand",
      ink: "bg-ink-900 text-white",
      amber: "bg-amber text-amber-ink",
      sky: "bg-sky text-sky-ink",
      lilac: "bg-lilac text-lilac-ink",
      pink: "bg-pink text-pink-ink",
      mint: "bg-mint text-mint-ink",
      lime: "bg-lime text-lime-ink",
    },
    radius: { md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl", "2xl": "rounded-2xl" },
    elevation: { none: "shadow-none", card: "shadow-card", raised: "shadow-raised" },
    interactive: {
      true: "cursor-pointer active:scale-(--press-scale-tile)",
      false: "cursor-default",
    },
  },
  defaultVariants: { tone: "surface", radius: "xl", elevation: "card", interactive: false },
});

const TINTED = ["amber", "sky", "lilac", "pink", "mint", "lime"] as const;

export type CardProps = ComponentPropsWithoutRef<"div"> &
  Pick<VariantProps<typeof cardVariants>, "tone" | "radius" | "elevation">;

export const Card = ({
  className,
  tone,
  radius,
  elevation,
  onClick,
  children,
  ...props
}: CardProps) => {
  const interactive = onClick !== undefined;
  /* A tinted card is separated by its colour; the DS gives it no shadow unless asked explicitly. */
  const tinted = TINTED.some((t) => t === tone);
  return (
    <div
      onClick={onClick}
      {...(interactive ? { role: "button", tabIndex: 0 } : {})}
      className={cn(
        cardVariants({
          tone,
          radius,
          elevation: elevation ?? (tinted ? "none" : "card"),
          interactive,
        }),
        /* Default padding, overridable through className like any other shadcn component. */
        "p-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
