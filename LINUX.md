# Stundio on Linux

The Linux application uses Tauri 2 to embed the existing React build. It packages the
interface locally and keeps the existing IndexedDB cache, so a previously loaded timetable
opens without a connection. Android and PWA builds continue using their existing transports.

## Desktop behavior

- EduPage requests go directly to `https://pikcrvt.edupage.org` through native HTTP.
  The Tauri capability permits only that school's HTTPS origin. No hosted proxy is needed.
- The normal school-timezone calculations, student/teacher views, themes and translations
  are shared with Android and the PWA.
- Sharing a week opens the Linux file chooser to save a PNG. Cancelling saves nothing.
- Lesson reminders run while the app process is open, including while the window is minimized.
  Old reminders are discarded after laptop suspend. Closing the window ends reminders.
- Schedule-change and new-timetable alerts follow the existing refresh policy: launch,
  returning to the window (with a one-minute throttle), and manual refresh. There is no
  background network polling or closed-app Web Push on Linux.
- Notifications use `org.freedesktop.portal.Notification`; the file chooser uses the XDG
  file portal. The app needs no general access to the home directory or notification bus.
- External links open in the default browser. Remote pages receive no app capabilities.
- The window remembers its size and position. Launching a second instance focuses the first.
- Updates belong to the Flatpak repository/software store. Android APK installation and
  Android update notifications are not offered on Linux. Android home-screen widgets remain
  Android features.

## Develop with host tools

Install Node.js 20 or newer, Rust 1.90 or newer, a C build toolchain, `pkg-config`, GTK 3 and
WebKitGTK 4.1 development packages. Follow the current
[Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux).

```sh
npm ci
npm run desktop:dev
```

```sh
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
npm run build
npm run desktop:check
npm run desktop:build
```

The standalone binary is `src-tauri/target/release/stundio`. The package and Rust versions
match after removing the JavaScript package version's leading `v`.

## Build a Flatpak

Install `flatpak`, `flatpak-builder` and `appstreamcli` (including its compose support),
add the Flathub remote, and install the SDKs:

```sh
flatpak install --user flathub org.gnome.Platform//51 org.gnome.Sdk//51 \
  org.freedesktop.Sdk.Extension.node24//26.08 \
  org.freedesktop.Sdk.Extension.rust-stable//26.08
npm run flatpak:build
```

The committed generated dependency manifests supply npm tarballs and Cargo crates, with
checksums, before the sandboxed build starts. `npm ci --offline` and `cargo --offline --locked`
must succeed without build-time network access. Only source downloads happen online.

The result is `Stundio-io.github.dmytropolizhai.stundio.flatpak`. Install it locally:

```sh
flatpak install --user ./Stundio-io.github.dmytropolizhai.stundio.flatpak
flatpak run io.github.dmytropolizhai.stundio
```

The app needs the GNOME runtime on the target machine; Flatpak handles that dependency.
The bundle is a local testing artifact, not a published Flathub listing. Repository-managed
updates become available only after a Flathub submission is accepted.

## Regenerate dependency sources

Do this whenever either lockfile changes. The generator version is recorded in
`packaging/flatpak/generated/tools.json`.

```sh
git clone https://github.com/flatpak/flatpak-builder-tools.git .desktop-tools/flatpak-builder-tools
git -C .desktop-tools/flatpak-builder-tools checkout 74697c75b630d7330e77250fc13cb5ea688d9479
python3 -m venv .desktop-tools/python
.desktop-tools/python/bin/pip install .desktop-tools/flatpak-builder-tools/node tomlkit aiohttp
.desktop-tools/python/bin/python packaging/flatpak/generate-sources.py
```

Resolve `src-tauri/Cargo.lock` with Cargo first after Rust dependency changes. Use
`generate-sources.py --cargo-only` when npm dependencies have not changed. The npm generator
receives clean temporary lockfile copies, so an existing `node_modules` cannot alter its output.
Review and commit the regenerated files with the dependency update.

## Isolated build tools

Build tools can also live inside `.desktop-tools/flatpak` without changing system packages:

```sh
export FLATPAK_USER_DIR="$PWD/.desktop-tools/flatpak"
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user --noninteractive --no-related flathub org.gnome.Sdk//51 \
  org.freedesktop.Sdk.Extension.node24//26.08 \
  org.freedesktop.Sdk.Extension.rust-stable//26.08
npm run flatpak:build
```

`.desktop-tools`, compiler output, build caches and local bundles are ignored by Git.
They are not part of a contribution or the installed app.

## Flathub preparation

The development manifest reads the local checkout. Before submission, the source must exist
in a public, immutable Git commit containing the Linux support. After the original maintainer
accepts and publishes that commit, export the submission files:

```sh
python3 packaging/flatpak/build.py --submission /tmp/stundio-flathub --ref <published-commit>
```

This replaces the local source with the upstream Git URL and commit. The command refuses a
dirty checkout. It does not create a pull request, upload a bundle, or publish anything.

The contribution includes screenshots captured from the installed Flatpak. Their metadata
URLs point to the intended upstream `main` paths; they will work after the maintainer publishes
these files. Before submitting, verify those URLs, validate the metadata and desktop file, and
test the submission manifest itself with `flatpak-builder`. Test both GNOME and KDE, Wayland and X11,
as well as x86_64 and aarch64 before claiming those environments are supported. Only x86_64
has been targeted by the local build so far. The submission export includes `flathub.json`
restricting distribution to x86_64 until aarch64 is verified.

The upstream application ID is `io.github.dmytropolizhai.stundio`. Store verification and
official ownership require the original maintainer's participation. Follow the current
[Flathub requirements](https://docs.flathub.org/docs/for-app-authors/requirements) and
[submission process](https://docs.flathub.org/docs/for-app-authors/submission). Flathub reviewers
decide acceptance; this contribution does not itself create a store listing.

### AI assistance and submission ownership

This Linux contribution was prepared with Codex: the Tauri shell, desktop adapters and tests,
Flatpak packaging, build automation, and accompanying documentation include AI-generated
material. The existing application is reused rather than rewritten.

Flathub's current [generative AI policy](https://docs.flathub.org/docs/for-app-authors/requirements#generative-ai-policy)
prohibits AI-generated or AI-assisted manifests and AI agents submitting or writing submission
and review messages. The included manifests and submission export are local development
artifacts; they are not suitable for submission as-is under that policy. A human maintainer
must independently author the final Flathub manifest, disclose the affected AI-generated
application and packaging material and its approximate extent, and handle submission and
review correspondence. Disclosure does not guarantee acceptance.

## Local verification

The x86_64 build has been compiled from offline dependency sources, installed as a Flatpak,
and opened against the school's live public timetable. A restart with an unavailable HTTPS
proxy retained the saved class and lessons and displayed the offline notice. Native school
requests failed in that session, confirming that the schedule came from the cache.

The notification portal works inside the installed sandbox. The native HTTP capability
rejects unrelated origins. AppStream metadata and the desktop launcher pass local validation.
An isolated layout pass using cached public data checks Home, Week and Settings, light/dark
themes and a 400 px window, with external network requests blocked. The frontend's existing
test suite and additional desktop routing, reminder, export and release checks also pass.

The installed file chooser returned a writable document-portal grant. The app-generated
weekly PNG was written through that grant and verified as a valid 1120 × 2878 image.
PNG byte handling and chooser cancellation are also covered by unit tests.

GitHub-hosted CI, KDE, X11 and aarch64 have not been verified here. Screenshots in this
contribution show the installed Linux build, with public school data only.
