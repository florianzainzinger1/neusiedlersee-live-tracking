import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, Geometry, LineString } from 'geojson';

/** Route or route slice as a GeoJSON LineString feature. */
export type RouteLine = Feature<LineString>;

/**
 * Calculates the distance between two coordinates in meters.
 * Uses the Haversine formula.
 */
export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export interface LocationPoint {
    lat: number;
    lon: number;
    timestamp: number;
    accuracy?: number;
}

// Global cached route for distance along track calculations
let routeLineString: RouteLine | null = null;
let routeLengthKm: number = 0;
const routeReadyCallbacks = new Set<() => void>();
let routeIsReady = false;

/** Get the currently loaded route GeoJSON */
export function getRouteLine(): RouteLine | null {
    return routeLineString;
}

/** Check if the GPX route has been loaded and cached. */
export function isRouteReady(): boolean {
    return routeIsReady;
}

/** Register a callback to be called when the route finishes loading. */
export function subscribeRouteReady(cb: () => void): () => void {
    routeReadyCallbacks.add(cb);
    return () => {
        routeReadyCallbacks.delete(cb);
    };
}

// Fixed official start location for the Neusiedlersee 100km Challenge
export const FIXED_START = {
    lat: 47.954496,
    lon: 16.823294
};

/**
 * Returns the distance (km) along the cached route at the official fixed start point.
 * Must be called AFTER prefetchRoute() has loaded the route.
 */
export function getFixedStartDistanceKm(): number | null {
    if (!routeLineString) return null;
    try {
        const startPt = turf.point([FIXED_START.lon, FIXED_START.lat]);
        const snapped = turf.nearestPointOnLine(routeLineString, startPt, { units: 'kilometers' });
        const start = turf.point(routeLineString.geometry.coordinates[0]);
        const sliced = turf.lineSlice(start, snapped, routeLineString);
        let distKm = turf.length(sliced, { units: 'kilometers' });
        if (distKm < 0) distKm = 0;
        if (distKm > routeLengthKm) distKm = routeLengthKm;
        return distKm;
    } catch (e) {
        console.error("Failed to compute fixed start distance:", e);
        return null;
    }
}

export async function prefetchRoute(url: string) {
    if (routeLineString) return;
    try {
        const res = await fetch(url);
        const data = (await res.json()) as Partial<FeatureCollection<Geometry>>;
        if (data.features) {
            for (const feature of data.features) {
                if (feature.geometry.type === 'LineString') {
                    routeLineString = feature as RouteLine;
                    routeLengthKm = turf.length(routeLineString, { units: 'kilometers' });
                    break;
                }
            }
        }
        // Notify all listeners that route is ready
        if (routeLineString) {
            routeIsReady = true;
            routeReadyCallbacks.forEach(cb => cb());
        }
    } catch (e) {
        console.error("Failed to load route geojson:", e);
    }
}

export interface RouteProgressResult {
    distanceKm: number;
    remainingKm: number;
    projectedPoint: [number, number]; // [lon, lat] for Map projection natively
    completedSegment: RouteLine;
    remainingSegment: RouteLine;
}

export function getRouteProgress(lat: number, lon: number): RouteProgressResult | null {
    if (!routeLineString) return null;

    try {
        const pt = turf.point([lon, lat]);

        // 1. Calculate perpendicular distance to route line in meters
        const distanceToLineKm = turf.pointToLineDistance(pt, routeLineString, { units: 'kilometers' });
        const distanceToLineMeters = distanceToLineKm * 1000;

        // Allow projection up to 400m, reject only if > 600m from route
        if (distanceToLineMeters > 600) {
            return null; // Too far from route, ignore
        }

        // 2. Project onto line (nearest point)
        const snapped = turf.nearestPointOnLine(routeLineString, pt, { units: 'kilometers' });

        const start = turf.point(routeLineString.geometry.coordinates[0]);
        const end = turf.point(routeLineString.geometry.coordinates[routeLineString.geometry.coordinates.length - 1]);

        // 3. Slice line up to the snapped point
        const completedSlice = turf.lineSlice(start, snapped, routeLineString);
        let distanceKm = turf.length(completedSlice, { units: 'kilometers' });

        // Clamp: ensure projection never returns erroneous values
        if (distanceKm < 0) distanceKm = 0;
        if (distanceKm > routeLengthKm) distanceKm = routeLengthKm;

        // 4. Slice the remaining tail of the route line
        const remainingSlice = turf.lineSlice(snapped, end, routeLineString);

        return {
            distanceKm,
            remainingKm: Math.max(0, routeLengthKm - distanceKm),
            projectedPoint: snapped.geometry.coordinates as [number, number],
            completedSegment: completedSlice,
            remainingSegment: remainingSlice
        };
    } catch (e) {
        console.error("Turf Geo Calculation error:", e);
        return null;
    }
}

/**
 * Deterministically slice the cached route at a given absolute distance (km along route).
 * Returns completed and remaining GeoJSON segments.
 * Can be called without any GPS data — only needs a distance value.
 */
export function getRouteSegmentsAtDistance(absoluteDistanceKm: number): { completed: RouteLine; remaining: RouteLine } | null {
    if (!routeLineString || routeLengthKm <= 0) return null;

    try {
        const clampedKm = Math.max(0, Math.min(absoluteDistanceKm, routeLengthKm));

        const completed = turf.lineSliceAlong(routeLineString, 0, clampedKm, { units: 'kilometers' });
        const remaining = turf.lineSliceAlong(routeLineString, clampedKm, routeLengthKm, { units: 'kilometers' });

        return {
            completed: completed,
            remaining: remaining
        };
    } catch (e) {
        console.error("getRouteSegmentsAtDistance error:", e);
        return null;
    }
}

// Kept for fallback in case route is not loaded or for free-roaming mode
export function calculateTrackDistanceKm(points: LocationPoint[]): number {
    if (points.length < 2) return 0;
    let totalDistKm = 0;
    let lastPoint = points[0];

    for (let i = 1; i < points.length; i++) {
        const p = points[i];
        if (p.accuracy && p.accuracy > 150) continue;

        const distMeters = getDistanceInMeters(lastPoint.lat, lastPoint.lon, p.lat, p.lon);
        const timeDiffSec = (p.timestamp - lastPoint.timestamp) / 1000;

        if (distMeters > 200 && timeDiffSec < 30) continue;

        if (distMeters > 5) {
            totalDistKm += (distMeters / 1000);
            lastPoint = p;
        }
    }
    return totalDistKm;
}

export function formatTime(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
}

export function getRelativeTimeString(timestampMs: number): string {
    const diffSec = Math.floor((Date.now() - timestampMs) / 1000);

    if (diffSec < 60) return 'gerade eben';
    const diffMins = Math.floor(diffSec / 60);
    if (diffMins === 1) return 'vor 1 Minute';
    if (diffMins < 60) return `vor ${diffMins} Minuten`;

    const diffHours = Math.floor(diffMins / 60);
    const date = new Date(timestampMs);

    if (diffHours < 24) {
        return `um ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr`;
    }

    return `am ${date.toLocaleDateString()}`;
}
