/**
 * Studio Design System — the public surface.
 *
 * Import components from here, never from a sibling file: the design system's own adherence lint
 * (`_adherence.oxlintrc.json`, mirrored in `eslint.config.js`) enforces it, and it is what lets a
 * component move between folders without touching every caller.
 *
 * Source of truth: the "Studio Design System" Claude Design project. Tokens under `ds/tokens/` are
 * verbatim copies — regenerate them rather than editing. Two files are deliberate local
 * deviations, both documented in place: `tokens/dark.css` (the DS is light-only) and
 * `tokens/fonts.css` (self-hosted rather than Google Fonts, because Stundio is offline-first).
 */

export { cn } from "./lib/utils.ts";

/* core */
export { Icon, type IconName, type IconProps } from "./components/ui/icon.tsx";
export { Button, type ButtonProps } from "./components/ui/button.tsx";
export { IconButton, type IconButtonProps } from "./components/ui/icon-button.tsx";
export { Chip, type ChipProps } from "./components/ui/chip.tsx";
export { Badge, type BadgeProps } from "./components/ui/badge.tsx";
export { Card, type CardProps } from "./components/ui/card.tsx";
export { Switch, type SwitchProps } from "./components/ui/switch.tsx";
export { Slider, type SliderProps } from "./components/ui/slider.tsx";
export { TextField, type TextFieldProps } from "./components/ui/text-field.tsx";
export {
  SelectField,
  type SelectFieldProps,
  type SelectOption,
} from "./components/ui/select-field.tsx";

/* feedback */
export { BottomSheet, type BottomSheetProps } from "./components/ui/bottom-sheet.tsx";
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  type PopoverContentProps,
} from "./components/ui/popover.tsx";
export { EmptyState, type EmptyStateProps } from "./components/ui/empty-state.tsx";
export { Skeleton, type SkeletonProps } from "./components/ui/skeleton.tsx";
export { Calendar, type CalendarProps } from "./components/ui/calendar.tsx";

/* navigation */
export { TopBar, type TopBarProps } from "./components/ui/top-bar.tsx";
export { BottomNav, type BottomNavItem, type BottomNavProps } from "./components/ui/bottom-nav.tsx";
export {
  SegmentedTabs,
  type SegmentedTabItem,
  type SegmentedTabsProps,
} from "./components/ui/segmented-tabs.tsx";

/* timetable */
export {
  LessonCard,
  type LessonCardProps,
  type LessonStatus,
  type LessonTone,
} from "./components/ui/lesson-card.tsx";
export {
  WeekGrid,
  type WeekGridCell,
  type WeekGridDay,
  type WeekGridPeriod,
  type WeekGridProps,
} from "./components/ui/week-grid.tsx";
export { SyncStatus, type SyncState, type SyncStatusProps } from "./components/ui/sync-status.tsx";
