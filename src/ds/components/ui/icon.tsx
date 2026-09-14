import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Coffee,
  Download,
  ExternalLink,
  Globe,
  GraduationCap,
  Info,
  LayoutGrid,
  MapPin,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Send,
  Settings,
  Share2,
  Star,
  Sun,
  TriangleAlert,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { cn } from "@/ds";

/**
 * The design system's icon wrapper — the one file that knows which icon set Stundio uses.
 *
 * Deviation from the DS, deliberately: the published `Icon.jsx` fetches Lucide SVG source from
 * the jsDelivr CDN at runtime. Stundio is local-first and runs in a Capacitor WebView with no
 * guaranteed network, so the glyphs are imported from `lucide-react` and bundled instead. The DS
 * readme sanctions exactly this for offline builds. Same set, same 2px stroke, same 24px grid.
 *
 * The map is explicit rather than a dynamic lookup so the bundler tree-shakes to just these.
 */
const ICONS = {
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  bell: Bell,
  "building-2": Building2,
  "calendar-days": CalendarDays,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  clock: Clock,
  cloud: Cloud,
  coffee: Coffee,
  download: Download,
  "external-link": ExternalLink,
  globe: Globe,
  "graduation-cap": GraduationCap,
  info: Info,
  "layout-grid": LayoutGrid,
  "map-pin": MapPin,
  moon: Moon,
  plus: Plus,
  "refresh-cw": RefreshCw,
  repeat: Repeat,
  search: Search,
  settings: Settings,
  "share-2": Share2,
  "triangle-alert": TriangleAlert,
  "user-round": UserRound,
  wifi: Wifi,
  "wifi-off": WifiOff,
  x: X,
  /*
   * Beyond the DS working set, and only where the DS's own rules demand a glyph:
   *  - sun / monitor: Settings offers light / dark / system, so `moon` needs partners.
   *  - star: favourite classes. The DS bans emoji and unicode-as-icon ("no ✓, ★, → in text —
   *    use the Lucide glyph"), which is exactly what this is.
   */
  sun: Sun,
  monitor: Monitor,
  star: Star,
  check: Check,
  send: Send,
} as const;

export type IconName = keyof typeof ICONS;

export type IconProps = {
  name: IconName;
  /** DS sizes: 14 inline in metadata, 18 in list rows, 20 default, 22 in the bottom nav. */
  size?: number;
  className?: string;
};

/**
 * Monochrome, always inherits `currentColor`. The DS forbids two-tone and filled icons — tried a
 * `filled` prop for the bottom nav's active tab and reverted it: Lucide's glyphs are outline sets
 * built from strokes plus decorative sub-paths (a calendar's day grid, a cap's tassel), not solid
 * shapes. `fill="currentColor"` fills every one of those sub-paths in the same colour as the
 * stroke, so the decorative strokes vanish into the fill and every icon collapses into a blob.
 * The active tab's pill plus its colour swap is the signal; don't reach for fill again.
 */
export const Icon = ({ name, size = 20, className }: IconProps) => {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={2}
      aria-hidden="true"
      className={cn("shrink-0", className)}
    />
  );
};
