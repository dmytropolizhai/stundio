import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { IconButton } from "./icon-button.tsx";
import { cn } from "../../lib/utils.ts";

export type TopBarProps = Omit<ComponentPropsWithoutRef<"header">, "title"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  onBack?: (() => void) | undefined;
  tone?: "app" | "brand";
};

/**
 * The screen header.
 *
 * Note it is *not* sticky, by design: the DS keeps the top bar scrolling with the content so the
 * day strip stays adjacent to the lesson list. Only the bottom nav is fixed.
 */
export const TopBar = ({
  className,
  eyebrow,
  title,
  actions,
  onBack,
  tone = "app",
  ...props
}: TopBarProps) => {
  const onBrand = tone === "brand";
  return (
    <header
      className={cn(
        "flex min-h-topbar items-center gap-3 py-1",
        onBrand ? "text-white" : "text-strong",
        className,
      )}
      {...props}
    >
      {onBack !== undefined && (
        <IconButton
          icon="arrow-left"
          label="Back"
          variant={onBrand ? "glass" : "light"}
          onClick={onBack}
        />
      )}
      <div className="min-w-0 flex-1">
        {eyebrow !== undefined && (
          <div
            className={cn(
              "font-text text-micro font-bold tracking-label uppercase",
              onBrand ? "text-white/72" : "text-muted",
            )}
          >
            {eyebrow}
          </div>
        )}
        {/*
          An `<h1>`, not the `<div>` the published component uses: this is the screen's title, and
          without it a screen reader's heading list is empty. The DS type is unchanged — the
          utilities override the base-layer `h1` size.
        */}
        <h1 className="font-display text-display-2 leading-none tracking-display text-current">
          {title}
        </h1>
      </div>
      {actions !== undefined && <div className="flex gap-2">{actions}</div>}
    </header>
  );
};
