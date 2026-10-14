# Architecture

Technical notes on how the dashboard is put together. For setup instructions see the [README](../README.md).

## Rendering and hosting

- Next.js (Pages Router) with `output: "export"`: every page is pre-rendered to static HTML in `out/` and served from Firebase Hosting (`firebase.json`, `cleanUrls: true`).
- No SSR and no API routes. All live data is read in the browser from Cloud Firestore with `onSnapshot` listeners.
- Leaflet and other browser-only components (`BlurMapBackground`, `SkyScene`, `WeatherWidget`) are loaded with `next/dynamic` and `ssr: false`.
- The frontend never writes to Firestore. Position, track and photo documents are written by the tracking device (a separate app, not part of this repository).

## Data flow

```
Phone app (tracking device) -> Firestore -> onSnapshot hooks -> useChallengeStats (Turf.js) -> UI
```

The phone app that records GPS fixes and photos is a separate project. This repository contains only the read side.

| Hook | Source | Purpose |
|------|--------|---------|
| `useChallenge` | `challenge_{env}/live` | Challenge status: `started`, `startTime`, `done`, `aborted`, `finalDistance`, ... |
| `useLiveLocation` | `dev_locations_{env}/{deviceId}` | Latest GPS fix. Fixes with accuracy > 100 m and repeated timestamps are dropped. Keeps the last 500 fixes in memory. |
| `useTrackpoints` | `challenge_{env}/live/track` | Full GPS track, ordered by timestamp. Downsampled to every third point above 5000 points. |
| `usePhotos` | `challenge_{env}/live/photos` | Photo diary. The km marker of each photo is derived from the track (see below). |
| `useChallengeStats` | derived | Distance, remaining distance, pace, average speed, ETA, completed/remaining route segments. |

### Environment separation

`src/lib/envBasePath.ts` maps `NEXT_PUBLIC_ENV` to collection names, so test runs never touch production data:

| `NEXT_PUBLIC_ENV` | Challenge collection | Location collection |
|-------------------|----------------------|---------------------|
| `dev` (default) | `challenge_dev` | `dev_locations_dev` |
| `prod` | `challenge_prod` | `dev_locations_prod` |

All hooks go through these functions; there are no hard-coded collection names elsewhere.

### Challenge document

```ts
{
  started: boolean,
  startTime: Timestamp,
  startLat: number,
  startLon: number,
  participants: number,
  startDistance: number,
  done: boolean,
  aborted: boolean,
  finishedAt: Timestamp,
  finalDistance: number
}
```

Timestamps arrive in several shapes (ms, seconds, ISO strings, Firestore `Timestamp`). `src/lib/normalizeTs.ts` converts all of them to milliseconds and rejects implausible values. For track points the document ID (written as a ms timestamp by the device) is the primary timestamp, with `tsMs` as fallback.

## Distance calculation

Distance is measured along the planned route (`public/routes/neusiedlersee.geojson`, a LineString), not as the raw sum of GPS hops, which overestimates distance because of GPS jitter.

1. The route is fetched once and cached at module level in `src/lib/geo.ts`. Components subscribe to a "route ready" event (`useRouteReady`) instead of polling.
2. A GPS fix is projected onto the route with `turf.nearestPointOnLine`.
3. Fixes more than 600 m from the route are ignored; the last valid distance is kept.
4. `turf.lineSlice` from the route start to the projected point, then `turf.length`, gives the absolute distance.
5. The start offset is subtracted: `startDistance` from the challenge document if present, otherwise the fixed official start point projected onto the route.
6. Until the route has loaded, no distance is computed.

Projecting every point on every render would be too expensive, so `useChallengeStats` processes new track points incrementally. The accumulated state (start offset, last valid distance, km series) is kept in an immutable cache in React state and advanced during render, the documented pattern for state derived from earlier renders. The calculation itself (`computeStats`) is a pure function.

Once the challenge is `done` or `aborted`, all derived values are frozen in that cache so late or noisy GPS updates cannot change the final result.

Photo km markers: the track is turned into a `(timestamp, distanceKm)` series; for each photo a binary search finds the last track point at or before the photo's timestamp.

The displayed pace (5 s) and ETA (30 s) are throttled (`useThrottledStats`) so the numbers do not flicker on every GPS update.

Time-dependent values come from one shared one-second clock (`useNow`, built on `useSyncExternalStore`). Client-only rendering uses `useIsClient` instead of a "mounted" flag set in an effect.

`/view/[sessionId]` is a minimal debug page that shows the raw position of one device document (`NEXT_PUBLIC_TRACKER_DEVICE_ID`) on an OpenStreetMap map.

## UI layering

The page body is the only scroll container. Background layers are `position: fixed` with `pointer-events: none`, so the blurred Leaflet map in the background cannot capture wheel or touch events (an earlier version with an inner scroll container broke scrolling in Chrome).

| z-index | Layer |
|---------|-------|
| 0 | `BlurMapBackground` (non-interactive Leaflet map, blurred) |
| 1 | Map overlay gradient / content layer |
| 2 | `SkyScene` (sky gradient, sun or moon, clouds, stars) |
| 9990-9999 | Dev badge, team modal, photo lightbox |
| 10000+ | Navigation menu |

Scroll effects (sky fade and parallax, map parallax) use passive scroll listeners and `requestAnimationFrame`.

## Time-of-day theming

`src/lib/timeTheme.ts` maps the local hour to `morning` (05-09), `day` (09-17), `sunset` (17-21) or `night` (21-05). `useTheme` sets a matching class on `<body>`, and CSS custom properties in `globals.css` switch colors, sky gradient and map filters. At night the cards are inverted to light backgrounds with dark text.

For testing, `?time=HH:MM` overrides the clock (`useSimulatedTime`).

## Other details

- **Weather:** `WeatherWidget` calls the Open-Meteo API (no key needed) and caches the response in `localStorage` for 15 minutes.
- **Segments:** `SegmentProgressWidget` splits the 111 km into 10 km stages and interpolates time and pace per stage. Horizontal on desktop, vertical on mobile.
- **Countdown:** each digit animates separately. The displayed digit is compared via a ref rather than state, which fixed a stale-closure bug in the first version.
- **Performance mode:** `Ctrl+Shift+P`, or `prefers-reduced-motion`, disables `backdrop-filter`, `filter` and shadows.
- **Entrance animations:** cards and sections fade in with staggered CSS animations.

## Directory layout

```
public/routes/        Planned route (GeoJSON LineString) and BRouter waypoints
src/components/       Background map, sky scene, countdown, menu, footer, widgets
src/hooks/            Firestore subscriptions, derived statistics, clock and client hooks
src/lib/              Firebase init, geo math, theming, timestamp helpers, config
src/pages/            Home, live map, info and legal pages, device debug view
src/styles/           Global CSS and design tokens
```
