# Stundio name and logo policy

Stundio's **code** is open source under the [MIT License](LICENSE). Copy it, change it, learn
from it, build your own app on top of it — that is what the license is for.

The MIT License covers the code and nothing else. It gives you no rights to the **Stundio
name, the Stundio logo and app icon, or the `stundio.lv` domains**. They are what tell students
and teachers which app is the real one, so they are kept separate from the code.

This policy exists for one reason: so that nobody installs a copy of the app believing it is
Stundio. Stundio has no login and never asks for a password, but a copy carrying its name could
— and the people it would hurt are the school's students and teachers.

## What you may do without asking

- Fork the repository and work on it, including under the Stundio name, as long as you do not
  publish builds from it.
- Say truthfully that your project is "based on Stundio", "a fork of Stundio" or "compatible
  with Stundio", with a link to this repository.
- Write about Stundio, review it, and use its name and screenshots when talking about it.
- Open pull requests here. Contributions stay part of Stundio and need no renaming.

## What a published fork must change

If you publish your own build anywhere — an APK, a web deployment, an app store, a Flatpak, a
Telegram channel, a school chat — it must not look like Stundio:

1. **A different name.** Not "Stundio", and not something easily mistaken for it ("Stundio
   Pro", "Stundio 2", "Stundyo", …).
2. **A different logo and app icon.** Replace everything under `resources/`,
   `android/app/src/main/res/` (launcher icons, widget previews), `public/` (favicons, PWA
   icons, banners) and `.github/assets/`.
3. **A different Android application id.** Change `com.dmytropolizhai.stundio` in
   `capacitor.config.ts` and `android/app/build.gradle`, so your app installs next to Stundio
   instead of posing as an update to it. Sign it with your own key.
4. **Your own User-Agent and contact.** Every `USER_AGENT` constant (in `src/lib/` and
   `functions/` — `grep -rn USER_AGENT src functions` finds them all) identifies this project
   to the school's EduPage server. Put your own app name and a way to reach *you* there, so
   the school can tell your traffic apart from Stundio's.
5. **Your own update source, analytics and push endpoints.** Point the release check
   (`src/lib/version/`), Plausible, the feedback form and Web Push at your own repository and
   services, not at Stundio's.
6. **No "official" or "endorsed" claims.** Do not suggest that Stundio or its author made,
   approved or supports your build.

Keep the MIT copyright notice in `LICENSE`, as the license requires.

## Official sources

Stundio is published **only** through:

- **[app.stundio.lv](https://app.stundio.lv)** — the web app, and
  [app.stundio.lv/download](https://app.stundio.lv/download) for the Android APK;
- **[GitHub Releases](https://github.com/dmytropolizhai/stundio/releases)** of
  `dmytropolizhai/stundio`.

Stundio is **not** on Google Play or any other app store. Every official Android build is signed
with the same key; see [Verifying your copy](README.md#verifying-your-copy) in the README.

## Reporting a copy

If you find a build that uses the Stundio name or logo, or one that asks for an EduPage
password, please [open an issue](https://github.com/dmytropolizhai/stundio/issues) with a link
to it. For anything you would rather not post publicly, use
[GitHub's private vulnerability reporting](https://github.com/dmytropolizhai/stundio/security/advisories/new).

## Questions

Not sure whether your use is fine? Open an issue and ask before you publish — the answer is
usually yes.

Stundio is an unofficial, non-commercial student project. It isn't affiliated with, endorsed
by, or supported by Rīgas Valsts tehnikums, EduPage, or aSc; their names belong to them.
