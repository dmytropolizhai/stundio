import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The shadcn class merger: `clsx` for conditionals, `tailwind-merge` so a caller's `className`
 * beats the component's own default instead of landing in an arbitrary source-order fight.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
