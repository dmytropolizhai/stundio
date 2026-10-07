/*
 * A tiny HTML template tag. Components are pure functions returning `Html`; every interpolated
 * string is escaped unless it is already `Html`, so copy from the dictionaries can never break
 * out of markup. There is no runtime framework on the landing — this runs at build time only.
 */
export type Html = { readonly html: string };
export type Slot = string | number | Html | false | null | undefined | readonly Slot[];

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

export const raw = (html: string): Html => ({ html });

const isHtml = (value: Slot): value is Html =>
  typeof value === "object" && value !== null && !Array.isArray(value) && "html" in value;

// `Array.isArray` does not narrow a readonly array, so the list case needs its own guard.
const isList = (value: Slot): value is readonly Slot[] => Array.isArray(value);

const slot = (value: Slot): string => {
  if (value === false || value === null || value === undefined) return "";
  if (isList(value)) return value.map(slot).join("");
  if (isHtml(value)) return value.html;
  return escapeHtml(String(value));
};

export const html = (strings: TemplateStringsArray, ...values: Slot[]): Html =>
  raw(
    strings.reduce((out, chunk, i) => out + chunk + (i < values.length ? slot(values[i]) : ""), ""),
  );

/** ` name="value"` or nothing — for attributes that must be absent rather than empty. */
export const attr = (name: string, value: string | false | null | undefined): Html =>
  value === false || value === null || value === undefined
    ? raw("")
    : raw(` ${name}="${escapeHtml(value)}"`);
