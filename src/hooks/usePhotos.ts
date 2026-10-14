import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { normalizeToMs, isValidMsTimestamp } from "../lib/normalizeTs";
import { getChallengeBase } from "../lib/envBasePath";

export interface PhotoData {
    id: string;
    url: string;
    timestamp: number;
    kmMarkerText: string;
    locationName?: string;
}

/**
 * Single source of truth for computing distance at a given timestamp.
 * Returns km (number) or null if no trackpoints exist.
 *
 * Logic:
 *   a) Find prev trackpoint (largest tsMs <= photoTs)
 *      - if prev exists -> return prev.distanceKm
 *      - else return first trackpoint's distanceKm
 *   b) If series empty -> return null
 */
function getDistanceAtTs(
    tsMs: number,
    trackSeries: { tsMs: number; distanceKm: number }[]
): number | null {
    if (trackSeries.length === 0) return null;

    // After or at last trackpoint -> latest distance
    if (tsMs >= trackSeries[trackSeries.length - 1].tsMs) {
        return trackSeries[trackSeries.length - 1].distanceKm;
    }

    // Before first trackpoint -> first distance
    if (tsMs <= trackSeries[0].tsMs) {
        return trackSeries[0].distanceKm;
    }

    // Binary search for the largest tsMs <= photoTs
    let left = 0;
    let right = trackSeries.length - 1;
    let prevIdx = 0;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (trackSeries[mid].tsMs <= tsMs) {
            prevIdx = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return trackSeries[prevIdx].distanceKm;
}

/** Raw photo doc from Firestore (before km computation) */
interface RawPhoto {
    id: string;
    url: string;
    tsMs: number;
    locationName?: string;
}

/**
 * Loads photos from Firestore (read-only).
 * Recomputes km for every photo whenever trackpointKmSeries changes.
 */
export function usePhotos(trackpointKmSeries?: { tsMs: number; distanceKm: number }[]) {
    const [rawPhotos, setRawPhotos] = useState<RawPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Subscribe to Firestore photos — only extracts raw data, no km computation
    useEffect(() => {
        const photosRef = collection(db, getChallengeBase(), "live", "photos");
        const q = query(photosRef, orderBy("tsMs", "desc"));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const photos: RawPhoto[] = [];

                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();

                    // Use shared normalizer — handles Firestore Timestamps safely
                    let tsMs = normalizeToMs(data.tsMs);

                    // Fallback: try timestamp field
                    if (tsMs === null || !isValidMsTimestamp(tsMs)) {
                        tsMs = normalizeToMs(data.timestamp);
                    }

                    // Fallback: try doc.id
                    if (tsMs === null || !isValidMsTimestamp(tsMs)) {
                        const idMs = Number(docSnap.id);
                        if (isValidMsTimestamp(idMs)) tsMs = idMs;
                    }

                    // Last resort
                    if (tsMs === null || !isValidMsTimestamp(tsMs)) {
                        tsMs = Date.now();
                    }

                    photos.push({
                        id: docSnap.id,
                        url: data.url || data.imageUrl || data.photoUrl,
                        tsMs,
                        locationName: data.locationName
                    });
                });

                setRawPhotos(photos);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error("Photos Firestore Error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Recompute km for ALL photos whenever rawPhotos OR trackpointKmSeries changes
    const photos: PhotoData[] = useMemo(() => {
        const series = trackpointKmSeries ?? [];
        // Ensure series is sorted ascending by tsMs
        const sorted = [...series].sort((a, b) => a.tsMs - b.tsMs);

        return rawPhotos.map((raw) => {
            const km = getDistanceAtTs(raw.tsMs, sorted);
            // Use km !== null (not !km) so that 0 is valid
            const kmMarkerText = km !== null ? km.toFixed(1) : "\u2014";

            return {
                id: raw.id,
                url: raw.url,
                timestamp: raw.tsMs,
                kmMarkerText,
                locationName: raw.locationName
            };
        });
    }, [rawPhotos, trackpointKmSeries]);

    return { photos, loading, error };
}