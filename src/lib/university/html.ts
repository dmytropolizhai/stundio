/**
 * The little HTML reading the LU pages (and RTU's semester `<select>`) need: entity decoding
 * and `data-*` attribute extraction. Every field LU publishes sits in a `data-*` attribute on
 * one machine-generated tag, so a regex over the opening tags is enough. A full `DOMParser`
 * tree of a semester-long page would be far slower on a phone.
 */

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return String.fromCodePoint(parseInt(code.slice(2), 16));
    }
    if (code.startsWith("#")) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return NAMED[code.toLowerCase()] ?? match;
  });

/** Tags stripped, entities decoded, whitespace collapsed. */
export const textOf = (html: string): string =>
  decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

/** Every `name="value"` attribute in one opening tag, values decoded. */
export const attributesOf = (tag: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z][\w-]*)\s*=\s*"([^"]*)"/g)) {
    const [, name, value] = m;
    if (name !== undefined && value !== undefined) attrs[name] = decodeEntities(value);
  }
  return attrs;
};
