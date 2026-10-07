# Stundio landing

A static, mobile-first landing page for Stundio. It is a separate build from the app: plain HTML
rendered at build time from TypeScript (no runtime framework), about 3 KB of gzipped JS. Languages:
`/` (default), `/en/`, `/ru/`, `/ua/` (and `lv` in the i18n sources).

## Commands (from the repository root)

```bash
npm run dev:landing       # Vite dev server
npm run build:landing     # Build into landing/dist
npm run preview:landing   # Serve landing/dist locally (http://localhost:4173/)
npx vitest run landing    # Landing tests
```

## Structure

- `src/config.ts` - every address (landing, app, download, GitHub, analytics host).
- `src/components/`, `src/styles/`, `src/icons/`, `src/content/` - markup, CSS and the HTML/CSS scene.
- `src/i18n/` - copy per language (`en`, `ru`, `ua`, `lv`).
- `src/scripts/` - small progressive-enhancement scripts (language switch, install tabs, FAQ,
  sticky CTA, device detection). The page is fully usable without JS.
- `src/render.ts`, `src/html.ts` - page rendering.
- `build/` - Vite plugin: pages, per-language font subsetting (`subset-font`), inlined CSS, QR code,
  sitemap, robots.txt.
- `public/` - copied as is: `_headers`, favicons, images.

## Changing the address

Edit `src/config.ts`. `LANDING_URL` is currently a placeholder
(`https://stundio-landing.pages.dev`) and `LANDING_ADDRESS_CONFIRMED` is `false`, so the build prints
a warning locally. With `CI=true` or `LANDING_REQUIRE_CONFIRMED=1` an unconfirmed address FAILS the
build (a placeholder must not reach production; Cloudflare Pages sets `CI`, so confirm the address
before the first real deploy). Canonical, hreflang, sitemap, the QR code, the "open on your phone" host and the
analytics domain are all derived from it. After changing the URL set
`LANDING_ADDRESS_CONFIRMED = true`, rebuild and redeploy. `APP_URL` / `DOWNLOAD_URL` point to the app.

## Deploy

Deploy to a SEPARATE Cloudflare Pages project, `stundio-landing`:

- Build command: `npm run build:landing`
- Output directory: `landing/dist`
- Root directory: repository root

```bash
npm run build:landing && npx wrangler pages deploy landing/dist --project-name stundio-landing
```

### Why not in the root of the main project

The app's service worker (`public/sw.js`) caches any same-origin navigation as the app shell. A
landing served from the same origin (`stundio.pages.dev`) would be replaced by the app offline
shell for returning visitors. A separate origin avoids that and keeps the app untouched.

## Moving to another domain later

1. Attach the custom domain to the `stundio-landing` Pages project.
2. Set `LANDING_URL` in `src/config.ts` (and `LANDING_ADDRESS_CONFIRMED = true`).
3. Rebuild: `qr.svg`, canonical, hreflang and the sitemap regenerate from the new URL.
4. Reprint or replace any already distributed QR code; the old `*.pages.dev` address keeps working
   unless you remove it.
5. Create a matching site in Plausible (the analytics domain follows `LANDING_HOST`).

## Dark theme

The app's dark theme is a `:root.dark { ... }` block in `src/ds/tokens/dark.css` (a user setting).
The landing follows the OS instead: `styles/ds-dark.css` holds only the marker `/* @ds-dark */`, and
the PostCSS plugin in `build/ds-dark.ts` (registered through `css.postcss` in `vite.config.ts`)
swaps it, after `postcss-import` has inlined the file, for the body of that block under
`@media (prefers-color-scheme: dark)`. It must be PostCSS, not a Vite `transform` hook: imported
files never pass through plugin hooks. `build/built-css.test.ts` builds the pages in memory and
checks the final inlined CSS for the dark values. Landing-only dark overrides (`--l-now`, hover
and cancelled-badge colours) are in `styles/tokens.css`; their contrast was recomputed from the token
values (all text pairs >= 4.5:1, the ring and focus colours >= 3:1).

## QA parameter `?platform=`

`?platform=android|ios|desktop` forces the device CTA set (the head script reads it first, then the
tab's `sessionStorage`, then the user agent). Any other value is ignored. Use it to see every set
without a phone, e.g. `/ru/?platform=ios#install-ios`.

## Screenshots allowlist

Only names in `ALLOWED_SHOTS` (`src/content/scene.ts`) may appear, currently `week-view`. Day and
subject views and the GitHub banner show real teachers' names and are refused at build time. A
screenshot is shown only if `public/img/<name>.{avif,webp,png}` all exist; `LANDING_PLACEHOLDERS=1`
draws labelled holes instead of omitting the frame.

## Language redirect

The root page sends a first, direct, human visit to the visitor's language (`shouldAutoRedirect` in
`src/lib/lang.ts`). It does not redirect after a stored choice, within a session (`sessionStorage`
flag), when the referrer is the landing itself (a language link works even with storage blocked), or
for `navigator.webdriver` and user agents matching `bot|crawl|spider`.

## Analytics

Plausible, events API only, no cookies. Create ONE site in the author's Plausible account whose
domain equals `LANDING_HOST` (`config.ts`; currently `stundio-landing.pages.dev`, update it together
with the address). Events and the closed `place` list are in `docs/landing/02a-ia.md` section 7 and
`src/lib/places.ts`. Nothing is sent on localhost or after the "do not count me" opt-out.

## Before launch: copy and checks that need a human

- RU and UA copy was written by the model: have a native speaker proof-read both.
- Open the built page in real browsers (this repo's CI cannot): iPhone Safari and Android Chrome at
  320, 360 and 390 px wide; check that the CTA is above the scene on a 360x640 screen, the language
  switcher fits at 320 px with 44 px targets, light and dark theme (OS switch), `prefers-reduced-motion`,
  the install tabs reached through `#install-ios` from a chat link, the in-app browsers (Instagram,
  Telegram) for the APK button, and `?platform=` for all three sets.
- Render and check the OG image (not produced yet) and the share preview.
- Measure first paint and the HTML+CSS weight on a real connection (current brotli size per page is
  about 14-15 KB against the 14 KB gzip budget in 03a/03b).
