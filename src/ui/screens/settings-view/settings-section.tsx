import type { ReactNode } from "react";
import { Card } from "@/ds";

type SectionProps = {
  title: string;
  children: ReactNode;
};

/** Also used by `CustomizationSheet`, which shares this screen's section/row look. */
export const Section = ({ title, children }: SectionProps) => (
  <section className="mb-7">
    <h2 className="u-eyebrow pb-2">{title}</h2>
    <Card radius="lg" className="p-0">
      {children}
    </Card>
  </section>
);

type RowProps = {
  children: ReactNode;
  className?: string;
};

/** A row inside a section card. Rows after the first carry the hairline. */
export const Row = ({ children, className = "" }: RowProps) => (
  <div className={`px-4 py-3.5 not-first:border-t not-first:border-hairline ${className}`}>
    {children}
  </div>
);
