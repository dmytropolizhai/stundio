# Fonts

Manrope and JetBrains Mono are installed from npm (`@fontsource/*`) and imported by
`src/ds/tokens/fonts.css`. Nothing to do for those.

**`moho-condensed-black.otf` is missing and must be added by hand.**

Moho Condensed is a licensed Latinotype face. It is not on npm and it is not redistributable, so
it is not committed here. It sets exactly one thing in the app — the `studio.` wordmark — and the
`--font-wordmark` stack degrades to Archivo Narrow / Arial Narrow / system-ui without it.

To restore it, copy the Black weight out of the design system project
(`assets/fonts/moho-condensed-black.otf`, or `uploads/Moho Condensed Font/moho-std-condensed-black.otf`)
into this directory under the name `moho-condensed-black.otf`.
