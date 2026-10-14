import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { LocationPoint } from "../lib/geo";
import { normalizeToMs, isValidMsTimestamp } from "../lib/normalizeTs";
import { getChallengeBase } from "../lib/envBasePath";

export function useTrackpoints() {
    const [trackpoints, setTrackpoints] = useState<LocationPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, getChallengeBase(), "live", "track"),
            orderBy("tsMs", "asc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                let pts: LocationPoint[] = [];
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    if (!data.lat || !data.lon) return;

                    // Primary: use doc.id as timestamp (phone writes ms as doc ID)
                    const idMs = Number(docSnap.id);
                    let tsMs: number | null = null;

                    if (isValidMsTimestamp(idMs)) {
                        tsMs = idMs;
                    } else {
                        // Fallback: normalize data.tsMs (handles Firestore Timestamp objects)
                        tsMs = normalizeToMs(data.tsMs);
                    }

                    if (tsMs === null || !isValidMsTimestamp(tsMs)) return;

                    pts.push({
                        lat: data.lat,
                        lon: data.lon,
                        timestamp: tsMs,
                        accuracy: data.accuracy || 0
                    });
                });

                // Sort by tsMs ascending (guaranteed order)
                pts.sort((a, b) => a.timestamp - b.timestamp);

                // Downsample if very large
                if (pts.length > 5000) {
                    const downsampled = [];
                    for (let i = 0; i < pts.length; i++) {
                        if (i % 3 === 0 || i === pts.length - 1) {
                            downsampled.push(pts[i]);
                        }
                    }
                    pts = downsampled;
                }

                setTrackpoints(pts);
                setLoading(false);
            },
            (err) => {
                console.error("Track history error:", err);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    return { trackpoints, loading };
}
