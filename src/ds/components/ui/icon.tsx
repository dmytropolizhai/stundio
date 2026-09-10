import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  Coffee,
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
  Settings,
  Share2,
  Sun,
  TriangleAlert,
  UserRound,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";

/**
 * The design system's icon wrapper — the one file that knows which icon set Studio uses.
 *
 * Deviation from the DS, deliberately: the published `Icon.jsx` fetches Lucide SVG source from
 * the jsDelivr CDN at runtime. Studio is local-first and runs in a Capacitor WebView with no
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
  "calendar-days": CalendarDays,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  clock: Clock,
  cloud: Cloud,
  coffee: Coffee,
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
   * Beyond the DS working set: Settings offers a light / dark / system theme choice, which needs
   * a partner for `moon`. Same set, same weight — nothing else is added here.
   */
  sun: Sun,
  monitor: Monitor,
} as const;

export type IconName = keyof typeof ICONS;

export type IconProps = {
  name: IconName;
  /** DS sizes: 14 inline in metadata, 18 in list rows, 20 default, 22 in the bottom nav. */
  size?: number;
  className?: string;
};

/** Monochrome, always inherits `currentColor`. The DS forbids two-tone and filled icons. */
export const Icon = ({ name, size = 20, className }: IconProps) => {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      strokeWidth={2}
      absoluteStrokeWidth
      aria-hidden="true"
      className={cn("shrink-0", className)}
    />
  );
};
