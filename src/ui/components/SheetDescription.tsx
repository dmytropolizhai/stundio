import type { ReactNode } from "react";
import { Icon } from "@/ds";

/**
 * A sheet's opening line: what the setting it belongs to does. Settings rows show the same
 * sentence under their label, so opening a setting explains it first.
 */
export const SheetDescription = ({ children }: { children: ReactNode }) => (
  <p className="mb-4 flex items-start gap-2.5 rounded-lg bg-sunken px-3.5 py-3 font-text text-caption text-fg">
    <Icon name="info" size={16} className="mt-0.5 text-muted" />
    <span>{children}</span>
  </p>
);
