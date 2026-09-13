/**
 * The shareable-image contract: what a week card is made of, expressed without a single
 * design-system or domain type.
 *
 * This layer paints pixels; it does not know what a lesson, a substitution or a subject accent
 * is. Colours arrive as resolved CSS colour strings and every visible string arrives already
 * translated, so the same painter serves light and dark, LV/EN/RU/UA, and — should it ever be
 * needed — a day card, without reaching upward into `ui/` (CLAUDE.md).
 */
import type { QrMatrix } from "./qr.ts";

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
  /** The navy the design system tints every shadow with. */
  shadow: string;
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
  /** The source period key ("1"), used to line cells up — never drawn. */
  period: string;
  start: string;
  end: string;
  /** One entry per column, `null` for a free slot. */
  cells: (ShareCell | null)[];
};

/** Where to get the app: a scannable code, with the URL spelled out for whoever cannot scan. */
export type ShareLink = {
  /** The URL as a person reads and types it — no scheme, since it is not a link here. */
  label: string;
  /** Dark-module matrix, or `null` when the URL could not be encoded. */
  qr: QrMatrix | null;
};

export type ShareImageData = {
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
  link: ShareLink;
};
