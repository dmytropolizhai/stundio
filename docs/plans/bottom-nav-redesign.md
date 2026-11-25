# Bottom nav redesign — implementation plan

Status: brief approved, not yet built.

## Goal

Replace the two floating pills with **one bottom bar** that is easy to reach one-handed, and move the day controls into the thumb zone.

## Approved decisions

| # | Decision |
|---|---|
| 1 | One bottom bar replaces the two pills. Primary tabs Home, Week, Changes keep their labels. Changes carries a count badge. |
| 2 | Subjects, Transit and Settings fold into one **More** slot that opens a bottom sheet. |
| 3 | The active pill takes the lamp accent. It keeps the sliding spring. |
| 4 | A date dock sits just above the bar on Home and Week, and steps the day or the week. |
| 5 | A fixed top bar carries read-only status: class name and sync freshness. This amends the DESIGN.md "One Fixed Thing Rule". |

## Things the brief did not cover (found in the code)

- **There is a third personal tab, Transit** (`TAB_ICONS.transit`, `showTransitTab`). More holds up to three entries: Subjects, Transit, Settings.
- **Teachers have one personal tab, Settings.** A More sheet with one row is pointless. Rule: if the More group has exactly one visible tab, render that tab as a direct slot with its own icon, no sheet.
- **`SideNav` (tablet and desktop) reads the same `useNavGroups`.** The grouping change must not break it. The rail keeps its two groups and labels. Only the phone bar changes.
- **The top bar today holds actions.** `ClassBadge` opens the class picker, `SyncBadge` has retry, and `ViewOptionsMenu` toggles options. A "read-only" fixed bar means those move. Decided: the **class picker moves to a row at the top of the More sheet**. Refresh is **pull-to-refresh only** (plus refresh on app open and resume, as today), so the sync retry action is dropped from the bar. View options stay where they are in the scrolling screen header.
- **Screens pad the bottom with `pb-nav-safe`** (`src/index.css:507`: nav height + inset + 20px + safe area). The date dock and the fixed top bar both change the clearance, so it needs updating in one place, not per screen.

## 1. Data model (`src/ui/components/nav-items.ts`)

- Keep `useNavGroups()` unchanged for `SideNav`.
- Add `useBarSlots()`:
  - **Primary slots:** the schedule group's tabs, in order.
  - **More slot:**
    - Items are the personal group's tabs minus the ones switched off (`hidden`).
    - 0 visible items: no slot.
    - 1 visible item: that item becomes a plain direct slot, same as a primary tab.
    - 2 or more: one `more` slot with `items` listed.
- The More slot is "active" when the current tab is one of its items.
- Pure and unit-tested with persona and settings combinations.

## 2. Changes badge count

- Source: the same count the Changes view already derives for today and later days. Locate the existing selector (`briefChanges` logic in `home-view.tsx` shows the pattern: lessons with `status !== "normal"`). Expose a store selector or a small hook `useChangesCount()` so the bar doesn't recompute from the Home screen.
- Display: a small count on the Changes icon, capped at "9+". The badge has a text alternative in the slot's accessible name ("Izmaiņas, 3").
- Hidden when 0.

## 3. The bar component

`src/ds/components/ui/bottom-nav.tsx` is rewritten as a single-surface bar. The DS exports stay stable: `BottomNav`, `BottomNavItem`, `BottomNavProps`.

- One `nav` landmark, one surface (`bg-card`, `shadow-nav`, `rounded-pill`), 64px tall, inset by `--nav-inset`.
- Equal-width slots, minimum touch target 48 px each.
- Slots can carry `badge?: number` and `children`-free content. The More slot is a button with `aria-haspopup="dialog"` and `aria-expanded`.
- Active indicator: the existing slide-with-spring pill, now filled with the lamp accent (`--lamp`, text `--lamp-ink`). The spring easing is already sanctioned for this exact motion.
- Compact and two-pill modes are removed together with the `style`, `compact` and `hidden`-column machinery that only the two-pill layout needed. `hidden` items are no longer passed in at all, because `useBarSlots()` already filters them.
- Contrast: `--lamp-ink` on `--lamp` is checked in both themes (Day and Night). Inactive icons and labels stay `text-muted` and are checked at 4.5:1 on the card surface.
- Reduced motion: the slide uses `--dur-base`, which collapses to 1ms.

## 4. The More sheet

New component `src/ui/components/MoreSheet.tsx`, built on the DS `BottomSheet`.

Contents, top to bottom:

1. **Class (or teacher) row.** Shows the current identity and opens the picker. Replaces the top bar's `ClassBadge` action.
2. **Destination rows** for the More items: Subjects, Transit, Settings, each with its icon and label.

Behavior:

- Picking a destination calls `onChange(tab)` and closes the sheet.
- The sheet closes on Escape, scrim tap and drag-down (already provided by `BottomSheet`/Radix).
- The Android back button closes the sheet first, via `useBackButton` at a priority above the existing "back to Home" handler.

## 5. Date dock

New component `src/ui/components/DateDock.tsx`, mounted by the app shell above the bar.

- Visible on Home and Week only. Changes keeps its own date handling.
- Contents: previous, the date label (opens the existing `DatePicker`), next, and a "today" action when not on today.
  - On Home: steps by school day (`prevDay`, `nextDay`).
  - On Week: steps by week (`prevWeek`, `nextWeek`), label shows the week range.
- It reads and writes through the existing `scheduleNav` object the shell already owns, so Day and Week stay in sync.
- It is a compact pill about 44px tall, 8px above the bar, same inset, same card surface, softer shadow than the bar so the bar stays the top of the stack.
- The in-content `DayHeader` and `WeekTopBar` date controls are removed once the dock exists, not duplicated. `DayHeader` keeps the weekday and long date as a heading, and the changes shortcut.
- Swipe paging stays as is.

## 6. Fixed top bar

New component `src/ui/components/StatusBar.tsx`, mounted by the shell on phone layout.

- Fixed to the top, below the safe-area inset. Contents: class (or teacher) name on the left, sync freshness on the right. No interactive controls, so there is no retry button: a failed or stale sync is shown as text, and the way to retry is pull-to-refresh.
- Height 36–40px, on `bg-app` with the same fade-out edge as content scrolling under it, so text doesn't collide visually.
- A `role="status"` region for the sync text, so a screen reader hears staleness without it being a control.
- Screens' scrolling headers lose their `ClassBadge` and `SyncBadge` in `HomeTopBar`, `WeekTopBar` and `ChangesTopBar`. Their titles and remaining controls stay.
- Top padding in every screen (`pt-safe-top`) grows by the bar's height through one shared token, `--status-bar-height`.
- DESIGN.md is updated after the build: the One Fixed Thing Rule becomes "the status bar and the bottom stack (date dock plus nav)".

## 7. Shell wiring (`src/App.tsx`, `src/ui/components/TabBar.tsx`)

- `TabBar` is rewritten around `useBarSlots()` and the new bar. It owns the More sheet's open state.
- `App.tsx` phone layout:
  - Mount `StatusBar` at the top.
  - Mount `DateDock` and `TabBar` in one fixed bottom stack so spacing between them is a single flex gap, and the stack's height is a single CSS variable the screens read.
- Wide layouts are unchanged: `SideNav` stays, and neither the dock nor the status bar mounts there.
- `pb-nav-safe` in `src/index.css:507` becomes: nav height + inset + dock height + gaps + safe area, via the shared variable. On tabs without a dock (Changes, Subjects, Transit, Settings) the variable drops the dock height so there's no dead space.

## 8. i18n

Added to `lv.ts` first, then `en.ts`, `ru.ts` and `ua.ts`. A missing key is a compile error.

- `nav.more`: "Vairāk" / "More" / "Ещё" and the Ukrainian equivalent.
- `nav.more.label`: the sheet's accessible name.
- `nav.changesBadge`: "{label}, {count}" for the accessible name.
- `dock.today`, `dock.prevWeek`, `dock.nextWeek`.
- Existing `day.previousDay` and `day.nextDay` are reused.
- `nav.group.*` stays for `SideNav`.
- All new words are checked for fit in Latvian and Russian at 360px width.

## 9. Tests

Update:

- `shell.test.tsx`, `teacherDualRole.test.tsx`, `wideLayout.test.tsx`, `screens.test.tsx`, `transitNavigation.test.tsx` and anything that queries the old two-nav markup.
- `HomeView.test.tsx`, `teacherDayWeek.test.tsx`: the date controls move from `DayHeader` and `WeekTopBar` to the dock.
- Tests that clicked `ClassBadge` now go through the More sheet. Tests that clicked the `SyncBadge` retry are replaced by pull-to-refresh tests.

New:

- `useBarSlots`: student with all tabs, student with Subjects off, Transit on and off, teacher (single direct Settings slot).
- Bar: active pill index, More active when the current tab is inside it, badge shows "9+", keyboard focus order, `aria-current`.
- More sheet: opens, row navigation closes it, back button closes it first.
- Date dock: steps day on Home and week on Week, "today" appears only when away from today, picker opens.
- Status bar: shows class and sync text, has no focusable controls.

## 10. Verification (one batched pass)

1. Typecheck, lint and the full vitest suite.
2. Dev server through `preview_start`, then check at 360, 390 and 768 px (768 confirms `SideNav` is unchanged) in Day and Night:
   - Bar, dock and status bar don't overlap content. The last list item is fully visible above the dock.
   - Active pill slide, including to and from More.
   - Contrast of the lamp pill and the inactive labels from computed colours.
   - Teacher persona and student with Subjects off.
   - Reduced-motion emulation.
   - LV, RU and UA labels fit.
3. One screenshot set as proof.

## 11. Build order

1. `useBarSlots` plus `useChangesCount` and tests.
2. Rewrite `bottom-nav.tsx` and `TabBar.tsx`.
3. `MoreSheet`.
4. `DateDock`, and remove the duplicated controls from `DayHeader` and `WeekTopBar`.
5. `StatusBar`, and strip `ClassBadge` and `SyncBadge` from the screen top bars.
6. Shell wiring and the shared clearance variable.
7. i18n in four languages.
8. Update and add tests.
9. Browser verification.
10. Update DESIGN.md.

## 12. Risks

- **The class picker is one tap deeper** (More, then the class row). That is the trade for a read-only fixed bar.
- **Pull-to-refresh is the only manual retry.** If sync fails the status bar says so, but there is no button. Pull-to-refresh must work on every tab that shows data (Home, Week, Changes). Verify it is wired on all three before removing the retry button.
- **Three fixed layers** (status bar, dock, bar) eat vertical space on small phones. At 360×640 the content area loses roughly 150 px. Mitigation: dock is hidden on keyboard open and the status bar is a single thin line.
- **Tests are widespread.** Many existing tests assume the two-pill DOM. Expect a lot of mechanical updates in step 8.
- **Wide layouts** must stay untouched. `SideNav` and `useNavGroups` are deliberately left alone.

## Resolved

1. The class picker moves to the More sheet. Refresh is pull-to-refresh only.
2. The date dock is the compact pill just above the bar on Home and Week. It holds previous, the date, next and a "today" action.
3. The dock appears on Home and Week only. Changes keeps its own date handling.

## Open questions

None. The plan is ready to build.
