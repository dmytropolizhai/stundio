![Stundio](.github/assets/github-banner-1200x400.png)

Stundio takes the public timetable from **Rīgas Valsts tehnikums** (`pikcrvt.edupage.org`) and turns it into a fast, offline-friendly schedule app.

There’s no login, no account, and no complicated setup. Pick your class and you can immediately see your lessons, substitutions, and what you have right now or next.

The name comes from **“stunda”**, the Latvian word for “lesson”.

Stundio is made specifically for students at the school. The idea is simple: you should be able to check your timetable in a few seconds, even when the Wi-Fi or mobile signal inside the building is terrible.

That’s why the app is **local-first**. Your timetable is stored on your device and updated in the background, so the app remains useful even when you’re offline.

## What it does

* **Day view** — See today’s lessons in one place. The current lesson is highlighted with a live progress bar, free periods appear as gaps, and cancelled lessons stay visible but are crossed out.
* **Week view** — A Monday-to-Friday overview for quickly comparing your schedule across the week.
* **Substitutions** — EduPage publishes things like room changes, teacher changes, and cancellations as Latvian HTML. Stundio parses that information and attaches it directly to the affected lesson instead of creating a separate changes feed.
* **Share your week as an image** — Turn the week view into a picture: your class, your form teacher, every lesson with its start and end time, and a note about which days are at another building. The image is drawn on your own device and passed straight to Android's share sheet, so it works offline and nothing is uploaded anywhere.
* **Class picker** — Save your favourite classes and switch between them whenever you need to. Your selection is stored on the device.
* **Offline-first** — The UI always works from the local cache. The app refreshes when you open it, manually pull to refresh, or return to the app. There’s no constant polling in the background.
* **Three languages** — The app interface is available in Latvian, English, and Russian. Substitution notes from the school are kept exactly as published and clearly marked as school-provided text.
* **Light and dark mode**.
* **Home-screen widget** *(planned, Android only)* — See your next lesson without even opening the app. This is also the main reason Stundio exists as a native app rather than just a website. See [PLAN.md](PLAN.md) for the current status.

## What it is not

Stundio isn't trying to be a replacement for EduPage.

* It only targets the public, class-based timetable of this school.
* There are no student accounts or individual logins.
* It isn't a grades app. An **e-klase** integration is an idea for Phase 6, but nothing has been decided or started yet.
* There is no Stundio backend. The app runs locally on your device and communicates directly with `pikcrvt.edupage.org`.

## Project status

The core of the app is already built: scraping, parsing, offline caching, syncing, and the full UI are all in place and covered by an extensive automated test suite.

The main thing that hasn't happened yet is testing it on an actual Android device or emulator. The development machine doesn't currently have the Android SDK or JDK installed.

Packaging, the Android home-screen widget, and the iOS version are still ahead.

For the detailed roadmap and current progress, see [PLAN.md](PLAN.md). For an explanation of how the EduPage scraping works, see [MODEL.md](MODEL.md).

## Installing on Android

There isn't a Play Store release yet. For now, the current version (`v0.0.1-alpha`) is available as an APK through [GitHub Releases](https://github.com/dmytropolizhai/stundio/releases).

### Option A — Download the release APK

1. Open the [Releases page](https://github.com/dmytropolizhai/stundio/releases) and download the `.apk` from the latest release. Currently, that's `v0.0.1-alpha`.
2. Open the downloaded APK on your Android phone.
3. Android will warn you that the app comes from an unknown source. That's expected because it isn't distributed through the Play Store yet.
4. Allow installation from the app you're using to open the APK when Android asks.

Keep in mind that this is still an early alpha. There may be rough edges, and the actual on-device experience hasn't been properly tested yet.

### Option B — Build it yourself

You'll need:

* **Node.js 20+** and npm
* **Android Studio** — mainly for the Android SDK and `adb`
* **JDK 21**
* An Android phone with USB debugging enabled, or an Android emulator

To use a physical phone, enable USB debugging through:

**Settings → About phone → tap “Build number” 7 times → Developer options → USB debugging**

Then, from the project root:

```bash
npm install
npm run android
```

`npm run android` builds the web app, syncs it into the Capacitor Android project in [android/](android), and launches it on a device or emulator detected by `adb`.

If multiple devices are connected, you'll be asked which one to use.

If you want to build an APK yourself instead:

```bash
npm run build
npx cap sync android
npx cap open android
```

This opens the project in Android Studio. From there, use:

**Build → Build Bundle(s) / APK(s) → Build APK(s)**

You can then copy the APK to your phone and install it. Android may ask you to allow installations from unknown sources for whichever app you use to open the APK.

## Installing on iOS

There isn't a native iOS app right now, and there are no plans for one.

For a small, non-commercial school project with roughly 100–250 potential users, maintaining a native iOS build and an Apple Developer account doesn't make much sense.

**iOS support is planned as a PWA (Progressive Web App)** and is tracked as Phase 7 in [PLAN.md](PLAN.md).

Once it's available, you won't need the App Store, Xcode, or an Apple Developer account:

1. Open the Stundio web app in **Safari** on your iPhone or iPad.
2. Tap the **Share** button.
3. Select **Add to Home Screen**.
4. Stundio will appear on your home screen and open like an app, without the normal browser UI.

The README will be updated with the actual web address once the PWA is released.

There are a few limitations on iOS. The Android home-screen widget and local notifications are native Android features, so they won't be available through the iOS PWA. The timetable, substitutions, and offline caching will still work.

## Development

```bash
npm install
npm run dev            # Start the Vite dev server
npm test                # Run the test suite
npm run typecheck       # Run TypeScript checks
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npm run build             # Build the production app
```

During development, EduPage requests are proxied through Vite to avoid CORS issues.

For the project's architecture and coding conventions, see [CLAUDE.md](CLAUDE.md).

If you're interested in how the EduPage integration works, [MODEL.md](MODEL.md) documents the reverse-engineered API contract.

The planned features and current progress are tracked in [PLAN.md](PLAN.md).

## Privacy

Stundio doesn't have a backend, analytics, or user accounts.

The app only communicates with `pikcrvt.edupage.org` to retrieve the school's timetable and substitution data. The data it receives is stored locally on your device.

Stundio doesn't collect information about you or send your usage data anywhere else.

## License

Stundio is licensed under the [MIT License](LICENSE).

See [PLAN.md](PLAN.md), Phase 5, for the current status.
