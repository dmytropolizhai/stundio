import type React from "react";
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The shadcn class merger: `clsx` for conditionals, `tailwind-merge` so a caller's `className`
 * beats the component's own default instead of landing in an arbitrary source-order fight.
 *
 * `extendTailwindMerge` registers the DS's named font-size utilities (`text-title`,
 * `text-display-2`, …) as their own group. Without this, default `tailwind-merge` doesn't
 * recognise them as font-size classes — it falls back to treating any unrecognised `text-*`
 * class as a text-*color* utility, so `text-title` and a later `text-current`/`text-strong`
 * "conflict" and the size class silently gets dropped from every element that pairs a DS type
 * scale with a DS text-color alias (which is most headings in this codebase).
 */
const twMerge = extendTailwindMerge<"ds-font-size">({
  extend: {
    classGroups: {
      "ds-font-size": [
        { text: ["hero", "display-1", "display-2", "title", "body-lg", "body", "caption", "micro"] },
      ],
    },
  },
});

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
