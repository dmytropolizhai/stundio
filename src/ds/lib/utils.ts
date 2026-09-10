import type React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The shadcn class merger: `clsx` for conditionals, `tailwind-merge` so a caller's `className`
 * beats the component's own default instead of landing in an arbitrary source-order fight.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

/**
 * Makes a non-button element behave like one.
 *
 * `Card` and `LessonCard` are `<div>`s because they nest headings and their own controls, which
 * a `<button>` may not contain. Giving them `role="button"` without keyboard activation would
 * announce them as buttons to a screen reader and then not work, so the handlers come as a set:
 * role, tab stop, click and Enter/Space together, or none of them.
 */
export const pressable = <T extends HTMLElement>(
  onClick: React.MouseEventHandler<T> | undefined,
) =>
  onClick === undefined
    ? {}
    : {
        role: "button" as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (event: React.KeyboardEvent<T>) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          /* Space scrolls the page by default; Enter would submit an enclosing form. */
          event.preventDefault();
          /*
           * These handlers act on the intent, not on pointer data — `currentTarget` is the only
           * field any of them reads, and a keyboard event carries it correctly.
           */
          onClick(event as unknown as React.MouseEvent<T>);
        },
      };
