import type { ReactNode } from "react";
import { Card, Icon, type IconName } from "@/ds";

type SectionProps = {
  /** Omitted for a card that stands on its own, like the reset row at the bottom. */
  title?: string;
  /** A glyph before the title that carries the group's state (e.g. a muted bell). */
  icon?: IconName | undefined;
  /** Something that needs attention inside the group — a status dot, never decoration. */
  indicator?: ReactNode;
  children: ReactNode;
};

/** Also used by `CustomizationSheet`, which shares this screen's section/row look. */
export const Section = ({ title, icon, indicator, children }: SectionProps) => (
  <section className="mb-7">
    {title !== undefined && (
      <h2 className="u-eyebrow flex items-center gap-1.5 px-1 pb-2">
        {icon !== undefined && <Icon name={icon} size={13} />}
        {title}
        {indicator}
      </h2>
    )}
    <Card radius="lg" className="overflow-hidden p-0">
      {children}
    </Card>
  </section>
);

type RowProps = {
  children: ReactNode;
  className?: string;
};

/** A free-form row inside a section card. Rows after the first carry the hairline. */
export const Row = ({ children, className = "" }: RowProps) => (
  <div className={`px-4 py-3.5 not-first:border-t not-first:border-hairline ${className}`}>
    {children}
  </div>
);
