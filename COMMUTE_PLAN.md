# RVT commute feature

## Goal

Help a student get from home to the correct RVT building in time for the first lesson, with a useful walking-to-stop experience and honest live-transit information.

## Product shape

- Add a student-only **Commute** screen; teachers keep the existing schedule navigation.
- Let the student save a home origin on-device, choose a walking buffer, and opt in to location use. Do not request location permission until the student starts location-based setup or tracking.
- Read the next lesson and its building from Stundio's existing schedule. Keep a manually selectable destination for lessons without a known building.
- Show a recommended leave time, the walk to the stop, transit legs, and arrival time. Let the student open the same itinerary in Google Maps.
- During an explicitly started trip, show the student's current position and progress to the selected stop. Stop tracking when the trip ends or the student stops it.
- Make reminders opt-in and schedule them locally. Recompute when the schedule changes or the student opens the app; do not silently run continuous location tracking.
- Keep the timetable available offline. Clearly mark commute data stale or unavailable when the network is missing.

## Live-location source investigation (2026-10-13)

| Source | What it provides | Can Stundio consume vehicle coordinates? | Assessment |
|---|---|---|---|
| Rīgas Satiksme / `saraksti.lv` live map | Rīgas Satiksme describes online arrivals and a live map of all vehicles on its own website. Its 2024 report also names `saraksti.lv` as the web/mobile timetable and real-time service. | **Yes for riders in the map; no published developer feed found.** Linking to the live map is the lowest-risk option; embedding may be possible but must be checked for site framing/terms. | Strongest immediate source, because it is the operator's user-facing real-time service. Ask RS for a supported API or permission to embed/reuse. |
| Legacy `saraksti.rigassatiksme.lv` GTFS-RT URLs | A community-maintained data-source list records old `vehicle_positions.pb`, `trip_updates.pb` and combined GTFS-RT URLs as discontinued (struck through). | No reliable current feed. | Do not build against the old host/feed. |
| `saraksti.lv/gpsdata.ashx` and `departures2.php` | The same community data-source list reports a current-looking GPS/arrival service, with a required `Origin-Custom: saraksti.lv` header for the GPS endpoint. | **Potentially.** This is an undocumented third-party web service, not a documented public API. Browser CORS, endpoint stability, allowed use, caching and attribution are unverified. | Best technical lead for a direct map integration. Ask the `saraksti.lv`/Rīgas Satiksme maintainer for API and reuse permission first; do not make production depend on it until confirmed. |
| Timey | Its Latvia data-source page marks Rīgas Satiksme as supporting GPS; the app offers real-time maps and notifications. | No public API contract found. | Ask Timey about developer/partner API access and reuse terms. If unavailable, open Timey for live tracking instead of extracting data from private endpoints. |
| Pieturas | Its maintainer publishes a combined Baltic GTFS-RT vehicle-position feed. The maintainer's data page says these combined feeds may be used **non-commercially with attribution**; it also lists Rīgas Satiksme's own source as closed. | **Potentially**, subject to verifying Riga coverage, feed freshness, mappings, and the stated non-commercial licence. | Contact the maintainer before using it. It may be viable for a free non-commercial Stundio release if permission/coverage are confirmed; licence may not fit a commercial/monetized release. |
| Rīgas Satiksme official app | Official product reports describe real-time vehicle and arrival information in the company's app. | No public developer API found. | Link users to the official app/map or request access from RS; do not reverse-engineer the app's private network calls. |
| Google Maps / Google Transit | Google Maps can show real-time transit arrivals and alerts when a transit partner supplies GTFS-Realtime. Routes API can return transit itineraries. | **No direct vehicle-position API for Stundio found.** Routes API is a route service, not a public RS live-vehicle feed; partner feeds are managed through Google Transit. | Use for itinerary handoff or route calculation if useful. Google would need to receive RS real-time data through its transit-partner pipeline for live info in Maps. Do not treat a Google Maps API key as a source of GPS positions. |
| Transitland / Mobility Database | Public discovery, archived copies and APIs for static Rīgas Satiksme GTFS (routes, stops and schedules). | No live positions in the RS feed record reviewed. | Useful fallback for scheduled routing/base stop matching only. Not a live source. |
| 1188.lv, Apple Maps, other journey planners | Public-facing journey planning may show routes, schedules or arrival estimates. | No documented feed/API for RS vehicle coordinates found. | Possible user-facing handoff only unless a provider publishes a supported developer API. |
| User's own phone GPS | Tracks the student's current position and can calculate distance/progress to a stop. | **Yes, for the student only.** | Useful for walk-to-stop progress, but it cannot reveal the bus/tram's location. Requires explicit foreground permission and opt-in tracking. |

### Recommended integration order

1. **Ship a live-map handoff first:** open the operator-linked `saraksti.lv` real-time map from Stundio. It already documents live vehicles, per-stop real-time arrivals, and route planning. This delivers a working rider feature without pretending we have data reuse rights or a direct feed.
2. **Request a supported RS / saraksti.lv feed.** Ask for current vehicle positions and stop predictions, format (GTFS-RT, SIRI, JSON, or other), update interval, CORS/server access requirements, licence/attribution, and redistribution/embedding permission.
3. **In parallel, ask Timey and Pieturas maintainers.** Timey has a GPS indicator for RS but no published API found. Pieturas publishes an aggregate feed with non-commercial attribution conditions, but Riga inclusion/freshness must be verified and its maintainer must confirm acceptable use.
4. **Keep static GTFS as fallback.** It can support planned routes and stops only; label scheduled arrivals clearly when live data is unavailable.
5. **If a feed is approved, integrate as GTFS-Realtime provider** and match `trip_id`/`route_id`/`stop_id` against static GTFS. Display source, last update time and stale state. If upstream CORS or rate limits prevent safe mobile direct calls, add a small cache/proxy service only after the source license allows it.

## Data and implementation constraints

- **Rīgas Satiksme static data:** the official open-data page says public route and timetable GTFS is published monthly, and allows open reuse. This is not the same as live GPS data.
- **Live source terms:** the old RS-hosted GTFS-RT URLs in a community list are marked discontinued. New `saraksti.lv` endpoints are only listed by that community source and have no public API contract found. Treat them as leads, not supported integrations.
- **Google Maps:** Routes API supports transit itineraries and walking legs, but a Maps API key alone does not provide raw Rīgas Satiksme vehicle positions. Google real-time transit information depends on partner GTFS-Realtime data being provided to Google Transit.
- **Location/privacy:** device GPS can locate the student; it is a separate permission and data stream from vehicle GPS. Save home coordinates locally and track the student only during an explicit trip.
- **App architecture:** keep schedule selection and leave-time maths in pure `src/lib/commute/` logic; isolate Maps and transit data access behind providers; persist preferences through the existing store/cache; keep UI consuming cached state and provider results through the existing store boundary.
- **Google Maps:** Google Routes API supports transit routing. A production integration needs a Google Cloud project, enabled Routes API, billing, and a restricted API key. Route data can be requested in the app with a platform-restricted key; never commit the key. Google Maps URLs can hand an itinerary to the Maps app without an embedded map SDK.
- **Privacy:** home coordinates and trip history stay local. Avoid retaining trip history by default. GPS is used only while the student has explicitly started commute tracking.
- **App architecture:** keep schedule selection and leave-time maths in pure `src/lib/commute/` logic; isolate Maps and Rīgas Satiksme network access behind providers; persist preferences through the existing store/cache; keep UI consuming cached state and provider results through the existing store boundary.

## Build sequence

1. **Built:** add a student-only Transit tab that loads the Rīgas Satiksme-linked live map (`saraksti.lv`) on demand, with a full-screen link fallback. The embedded map can use the browser's geolocation only when the student chooses its location control.
2. **Partly built:** save the home address in Settings; get a foreground GPS location when Transit is opened after 07:00; use the selected class's first lesson/building for the schoolbound direction and switch to homebound at lesson start.
3. **Partly built:** request up to four alternative transit itineraries using Google Routes API and display legs, route names, colors, stops and times in the Transit tab. The API needs a restricted `VITE_GOOGLE_MAPS_ROUTES_API_KEY`; without it, the screen shows an explanation. An itinerary is not guaranteed to include live vehicle positions or predicted arrivals.
4. Add Rīgas Satiksme scheduled service from GTFS, with feed freshness shown in the UI.
5. Add direct live vehicle positions only after an official, accessible feed is confirmed. Match positions to scheduled trips/stops and show feed age so old GPS fixes are not presented as live.

## External inputs needed for a production route/live-data release

- Confirmation of a supported real-time feed or approved `saraksti.lv` embedding. Candidates to contact: Rīgas Satiksme / saraksti.lv, Timey, and Pieturas. Ask for format, licensing, access, update cadence, and redistribution rights.
- Google Cloud project configuration and a platform-restricted Routes API key only if Stundio calculates route options itself; Google Maps app handoff does not require a key.
- RVT main and TIC destination coordinates, verified against the school timetable's building labels.
- Google Cloud project and restricted Routes API key if Stundio should show transit alternatives and walking legs within its own screen and calculate the leave time automatically.
- A restricted Google Routes API key in the local/deployment environment (`VITE_GOOGLE_MAPS_ROUTES_API_KEY`). Enable Routes API and billing in Google Cloud; usage may be billed according to the current Google Maps Platform pricing.
