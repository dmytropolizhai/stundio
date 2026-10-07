/*
 * The closed list of values the `place` property of the `CTA` event may take (02a section 7):
 * where on the page the tapped call to action sits. Never free text.
 */
export const PLACES = [
  "hero",
  "sticky",
  "now",
  "install",
  "teachers",
  "faq",
  "final",
  "footer",
] as const;
export type Place = (typeof PLACES)[number];

export const isPlace = (value: string | null | undefined): value is Place =>
  PLACES.some((p) => p === value);
