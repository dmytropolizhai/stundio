# Home header: two-tile grid — implementation plan

Status: built.

## Goal

Replace the single brief card at the top of Home with a 2-column grid of square tiles:

1. **School tile** — gradient background, a big countdown number, and a small "until" label under it.
2. **Weather tile** — only the temperature with a degree sign. The weather is shown by an animated background (rain, snow and so on). No icon, no range, no hint badge.

## Confirmed decisions

| # | Decision |
|---|---|
| 1 | The countdown shows whole hours plus a plus sign (`2+`) when more than an hour is left, otherwise minutes. Tapping the tile expands it horizontally to the full `h:mm`, with a smooth animation. |
| 2 | Idle states keep the tile and switch its face: ahead shows time until the first lesson, finished shows "Done", a free day shows "Free". |
| 3 | The umbrella, snow and cold hint badge is removed. The weather background carries it. |
| 4 | The "Changes: N" chip stays, as a single chip under the grid, only when there are changes. |
| 5 | The expanded countdown auto-collapses after about 6 s of inactivity. |
| 6 | For a later browsed day, the school tile shows that day's start time, labelled with the day, instead of a countdown. |
| 7 | The day range and lessons-left are no longer visible. They stay in aria-labels. |

## 0. Starting point

- `src/ui/screens/home-view/home-brief.tsx` renders one `Card`: `BriefText` on the left, `WeatherTile` on the right, then the hint and changes badges, then the glance card as `children`.
- `DayBrief` kinds: `ahead` (has `start`), `ongoing` (has `end`), `finished`, `free`. The times are `HHMM` strings.
- `useNow()` already ticks once per minute in `home-view.tsx`. `HomeBrief` doesn't receive it yet.
- `minutesOf(HHMM)` exists in `@/lib/schedule`. Keyframes live in `src/index.css`.
- Tokens available: `--lamp*`, `--dur-*`, `--ease-*`, `--press-scale-tile` (zeroed under reduced motion).

## 1. Pure logic (React-free, tested)

New file `src/lib/schedule/countdown.ts`, exported from `src/lib/schedule/index.ts`, tests in `src/lib/schedule/__tests__/countdown.test.ts`.

`schoolCountdown(brief, nowMinutes, laterDay)` returns one of:

- `{ kind: "until", target: "end" | "start", minutes, hours, rest }`
- `{ kind: "startsAt", start }` for a later browsed day
- `{ kind: "done", end }`
- `{ kind: "free" }`
- `null` when the brief is null

Rules:

- `ongoing` counts to `end`. `ahead` on today counts to `start`.
- `minutes` is clamped to at least 0 and `hours = floor(minutes / 60)`.
- Compact form: `hours >= 1` gives `"{hours}+"`, otherwise `"{minutes}"` with the unit "min".
- Full form: `h:mm`.

Tests: 0, 59, 60, 61 and 125 minutes, the clamp, each brief kind, and the later-day case.

## 2. Weather scene mapping (pure, tested)

New file `src/lib/weather/scene.ts`.

`weatherScene(outlook)` returns `{ sky, precip, flash }`:

- `sky`: `clear-day`, `clear-night`, `cloudy`, `fog`, `cold` or `storm`.
- `precip`: `none`, `drizzle`, `rain` or `snow`.
- `flash`: true only for thunderstorm.

The hint overrides the current hour: `hint === "umbrella"` forces rain, `"snow"` forces snow, and `"cold"` gets the cold tint with no particles. A rainy school window therefore shows rain even if the current hour is dry.

Test: a table test over every condition, day and night, and each hint.

## 3. UI components (`src/ui/screens/home-view/`)

| File | Role |
|---|---|
| `home-brief.tsx` | Grid container and the changes chip. Drops `BriefText`, `WeatherTile`, `CONDITION_ICON` and `HINT`. |
| `school-tile.tsx` | New. The countdown tile. |
| `weather-tile.tsx` | New. The temperature tile. |
| `weather-backdrop.tsx` | New. Sky gradient plus the particle layer. |

### 3a. Grid (`home-brief.tsx`)

- Two columns with a `gap-3`. Tiles are `aspect-square`, `rounded-xl`, `min-w-0`, `overflow-hidden`. They are plain `button` and `div` elements, not `Card`s.
- Expand animation:
  - A plain `col-span` change cannot animate, so the grid animates `grid-template-columns` from `1fr 1fr` to `2fr 0fr`.
  - The hidden weather tile sits in the `0fr` track with `min-width: 0`, opacity 0 and `inert`, so it can't be tabbed to or read while collapsed.
  - Row height is held equal to the collapsed square, so the content below never jumps.
  - Timing is `--dur-slow` with `--ease-standard`. It becomes 1ms under reduced motion.
  - Fallback if the grid interpolation proves fragile: measure the column width once with a `ResizeObserver` and set an explicit pixel height.
- Weather off or null: one column, the school tile is full width at the same height as a square tile.
- `brief === null` but weather present: the weather tile is full width.
- The changes chip row renders under the grid only when `showChanges`. The hint badge is removed.
- The existing early return stays: nothing renders if `brief`, `weather` and `children` are all absent.
- `data-testid="home-hero"` is kept.

### 3b. School tile (`school-tile.tsx`)

- A `<button type="button">` with `aria-expanded` and `aria-controls`, and the existing press-scale behaviour.
- Only the `until` and `startsAt` faces are interactive. Done and free render as a non-interactive `div`.
- Background gradients come from lamp tokens with `color-mix`, no raw hex:
  - Ongoing: lamp to a deeper lamp mix, text in `--lamp-ink`.
  - Ahead: a cooler, quieter variant of the same ramp.
  - Done and free: a resting gradient mixed toward `--surface-card`, text in `--text-strong`.
- Contrast: 4.5:1 for the small label and 3:1 for the large number, measured in Day and Night. The mix is adjusted if short.
- Layout, bottom-left aligned:
  - Number in `font-display`, `text-display-1`, `tabular-nums`, `leading-none`.
  - Small "until" label under it. No eyebrow above the number.
  - Collapsed minutes carry a smaller "min" unit span beside the number.
- Expanded: `h:mm` at the same scale with the label "until end" or "until start". The digits crossfade and use `tabular-nums` so they don't jitter.
- Collapse triggers: second tap, outside tap, Escape, and about 6 s of inactivity.
- `data-testid="home-brief"` stays on this element. Its `aria-label` carries the full sentence, reusing "School until 15:45" and "Lessons left: N".

### 3c. Weather tile (`weather-tile.tsx`)

- Content is `{temperature}°` only, in `font-display`, `text-display-1`, bottom-left on the same baseline as the school tile.
- Later-day forecast: a tiny day label ("Rīt") in the top-left, `data-testid="home-weather-day"` kept.
- `aria-label` is unchanged from today's: condition, temperature, range and day.
- Text colour is chosen per sky variant for contrast.

### 3d. Backdrop (`weather-backdrop.tsx`)

- Sky is a CSS gradient per `sky` value, built from the muted DS accent tones plus `--ink-*` for night and storm.
- Particles are pure CSS (no canvas, no library, no JS ticking):
  - About 14 rain streaks or 18 snowflakes, positioned from a fixed deterministic array so they are stable across renders.
  - Rain: 1px streaks slanted about 12°, falling linearly.
  - Snow: small circles falling and swaying at different speeds.
  - Drizzle: fewer, shorter streaks.
  - Storm: an occasional opacity flash on an overlay.
- New keyframes in `src/index.css` beside the existing ones: `studio-rain-fall`, `studio-snow-fall`, `studio-sky-flash`.
- The layer is `aria-hidden`, `pointer-events-none`, behind the number, with `data-testid="weather-backdrop"`, `data-sky` and `data-precip`.
- `prefers-reduced-motion`: animations are off and a still frame stays.
- Animations pause when the page is hidden (a `visibilitychange` listener toggles a `data-paused` attribute), to save battery in the Capacitor web view.

## 4. Wiring

- `home-view.tsx`: pass `nowMinutes={now.minutes}` to `HomeBrief`. Nothing else in the view changes.
- `HomeBrief` computes `schoolCountdown(brief, nowMinutes, briefDate !== null)` once with `useMemo`.

## 5. i18n

Add to `src/ui/i18n/lv.ts` first, then `en.ts`, `ru.ts` and `ua.ts`. A missing key is a compile error.

- `home.school.until`: "līdz" / "until" / "до" and the Ukrainian equivalent.
- `home.school.untilStart`, `home.school.untilEnd`: the expanded labels.
- `home.school.min`: "min".
- `home.school.done`, `home.school.free`.
- `home.school.expand`, `home.school.collapse`: toggle aria text.
- Remove old `home.brief.*` and `home.weather.hint.*` keys only after grepping that nothing still uses them.

## 6. Tests (`src/ui/__tests__/HomeView.test.tsx` and new files)

Updates to existing tests:

- `home-brief` `textContent` assertions become `aria-label` assertions.
- Weather: `textContent` contains "14°" but no longer "17° / 10°". The aria-label assertion keeps the range.
- `home-weather-hint` assertions become `weather-backdrop` checks on `data-precip`.

New tests:

- Compact `2+` and `42` rendering.
- Tap expands to the full `h:mm`, `aria-expanded` flips, a second tap collapses, Escape collapses, and the 6 s timer collapses (fake timers).
- The weather tile is `inert` while expanded.
- Done face on a finished day, free face on a free day.
- Later browsed day shows its start time.
- Full-width school tile when weather is off.
- Pure tests for `schoolCountdown` and `weatherScene`.

## 7. Verification (one batched pass)

1. Typecheck, lint and the full vitest suite.
2. Dev server through `preview_start`, then check at 360, 390 and 768 px in Day and Night:
   - Tiles are square and equal in height.
   - Expand and collapse is smooth, with no reflow of the content below.
   - Contrast on every gradient, from computed colours.
   - Rain, snow, storm, fog, clear-night and clear-day, forced with a mocked forecast.
   - Reduced-motion emulation.
   - LV, EN, RU and UA labels fit.
3. One screenshot set as proof.

## 8. Build order

1. `countdown.ts` plus tests.
2. `scene.ts` plus tests.
3. Keyframes in `index.css`.
4. `weather-backdrop.tsx`, `weather-tile.tsx`, `school-tile.tsx`.
5. Rework `home-brief.tsx` and wire `home-view.tsx`.
6. i18n keys in four languages.
7. Update and add tests.
8. Verify in the browser.

## 9. Risks

- **Smooth horizontal expand without a layout jump** is the hardest part. The mitigation is the grid-track interpolation with the measured fallback.
- **Animation cost on low-end Android.** Under 20 particles, transform-only animation, paused when hidden.
- **Less visible data.** The day range, lessons-left and the later-day brief text now live only in aria-labels. This is intentional, per the brief.
