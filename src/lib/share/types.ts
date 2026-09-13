/**
 * The shareable-image contract: what a week card is made of, expressed without a single
 * design-system or domain type.
 *
 * This layer paints pixels; it does not know what a lesson, a substitution or a subject accent
 * is. Colours arrive as resolved CSS colour strings and every visible string arrives already
 * translated, so the same painter serves light and dark, LV/EN/RU/UA, and — should it ever be
 * needed — a day card, without reaching upward into `ui/` (CLAUDE.md).
 */

/** Surface and text colours, pulled from the live theme by the caller. */
export type SharePalette = {
  /** The card's outer ground. */
  background: string;
  /** The panel the grid sits on. */
  surface: string;
  /** An empty cell — a lesson-free slot. */
  sunken: string;
  hairline: string;
  /** The ring drawn around a lesson in another building. */
  strongBorder: string;
  text: string;
  strong: string;
  muted: string;
};

/** One lesson cell. `fill`/`ink` are the subject accent pair the app already assigned it. */
export type ShareCell = {
  /** The short subject code, as the week grid draws it. */
  label: string;
  /** Room, group — whatever fits under the code. Dropped when the cell is too small. */
  detail?: string;
  fill: string;
  ink: string;
  /** Lesson in a building other than the pinned/main one — drawn with a ring. */
  outlined?: boolean;
  cancelled?: boolean;
};

export type ShareColumn = {
  /** "Pr", "Ot" — already localized. */
  weekday: string;
  /** "8.09." under the weekday. */
  date: string;
};

export type ShareRow = {
  /** Period label ("1"), drawn small next to the times. */
  period: string;
  start: string;
  end: string;
  /** One entry per column, `null` for a free slot. */
  cells: (ShareCell | null)[];
};

export type ShareImageData = {
  /** Small caps line above the class name — "Stundu saraksts". */
  eyebrow: string;
  /** The class the card is for — the biggest thing on it. */
  className: string;
  /** "07.09.–11.09." — the week the card covers. */
  period: string;
  /** Form teacher, label included so this layer never composes a sentence. */
  classTeacher: { label: string; name: string } | null;
  columns: ShareColumn[];
  rows: ShareRow[];
  /** Building lines ("TIC: Ot, Ce") — one per building the week visits. */
  notes: string[];
  /** Wordmark in the footer. */
  brand: string;
  /** Where to get the app — the release page, without its scheme. */
  link: string;
};
