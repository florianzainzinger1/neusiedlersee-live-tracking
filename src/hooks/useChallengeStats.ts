import { useMemo, useEffect, useState } from 'react';
import { LocationData } from './useLiveLocation';
import { ChallengeData } from './useChallenge';
import { LocationPoint, getRouteProgress, prefetchRoute, getFixedStartDistanceKm, getRouteSegmentsAtDistance, type RouteLine } from '../lib/geo';
import { normalizeToMs } from '../lib/normalizeTs';
import { toDateSafe, formatClockTime } from '../lib/time';
import { challengeConfig } from '../lib/challengeConfig';
import { useRouteLine } from './useRouteReady';

export interface KmSeriesEntry {
    tsMs: number;
    distanceKm: number;
}

export interface ChallengeStats {
    distanceKm: number;
    remainingKm: number;
    completedSegment: RouteLine | null;
    remainingSegment: RouteLine | null;
    avgSpeedKmh: number;
    paceString: string;
    etaString: string;
    elapsedMs: number;
    isStarted: boolean;
    trackpointKmSeries: KmSeriesEntry[];
}

interface Segments {
    completed: RouteLine | null;
    remaining: RouteLine | null;
}

/**
 * State carried between renders. Trackpoints are processed incrementally
 * (projecting every point onto the route on each render would be too expensive),
 * so the hook remembers how far it got. The cache is immutable: every change
 * produces a new object, which is stored with the "adjust state during render" pattern.
 */
interface StatsCache {
    /** Route distance (km) of the official start; subtracted from all distances. */
    startDist: number | null;
    lastValidDistance: number;
    lastValidSegments: Segments;
    series: KmSeriesEntry[];
    lastProcessedIndex: number;
    /** Result captured when the challenge is done or aborted; never changes afterwards. */
    frozen: ChallengeStats | null;
}

const EMPTY_CACHE: StatsCache = {
    startDist: null,
    lastValidDistance: 0,
    lastValidSegments: { completed: null, remaining: null },
    series: [],
    lastProcessedIndex: -1,
    frozen: null,
};

function computeStats(
    prevCache: StatsCache,
    challenge: ChallengeData,
    location: LocationData | null,
    trackpoints: LocationPoint[],
    nowMs: number | null,
    routeLine: RouteLine | null
): { stats: ChallengeStats; cache: StatsCache } {
    // Reset all accumulated state while the challenge is not running
    let cache = challenge.started ? prevCache : EMPTY_CACHE;

    const isFinalState = challenge.done || challenge.aborted;

    if (isFinalState && cache.frozen) {
        return {
            stats: {
                ...cache.frozen,
                completedSegment: cache.frozen.completedSegment || cache.lastValidSegments.completed,
                remainingSegment: cache.frozen.remainingSegment || cache.lastValidSegments.remaining
            },
            cache
        };
    }

    // Start offset: prefer the value stored in Firestore, otherwise project the fixed start point.
    // Locked once per started challenge.
    if (challenge.started && cache.startDist === null) {
        const startDist = challenge.startDistance ?? getFixedStartDistanceKm();
        if (startDist !== null) {
            cache = { ...cache, startDist };
        }
    }

    let distanceKm = 0;
    let remainingKm = challengeConfig.plannedDistanceKm;
    let completedSegment: RouteLine | null = null;
    let remainingSegment: RouteLine | null = null;
    let avgSpeedKmh = 0;

    const startDate = toDateSafe(challenge.startTime);
    const startMs = startDate ? startDate.getTime() : null;

    if (challenge.started && startMs) {
        // Filter to trackpoints with valid timestamps >= startMs
        const relevantHistory = trackpoints.filter(p => {
            const ms = normalizeToMs(p.timestamp);
            return ms !== null && ms >= startMs;
        });

        // Integrate live location if it's not already in trackpoints
        const locMs = location ? normalizeToMs(location.timestamp) : null;
        if (location && locMs !== null && locMs >= startMs) {
            const lastPt = relevantHistory.length > 0 ? relevantHistory[relevantHistory.length - 1] : null;
            const lastPtMs = lastPt ? normalizeToMs(lastPt.timestamp) : null;
            if (lastPtMs === null || locMs > lastPtMs + 2000) {
                relevantHistory.push({ lat: location.lat, lon: location.lon, timestamp: location.timestamp, accuracy: location.accuracy });
            }
        }

        if (relevantHistory.length === 0) {
            return {
                stats: {
                    distanceKm: 0,
                    remainingKm: challengeConfig.plannedDistanceKm,
                    avgSpeedKmh: 0,
                    paceString: "—",
                    elapsedMs: (nowMs ? Math.max(0, nowMs - startMs) : 0),
                    etaString: "Warte auf GPS…",
                    isStarted: true,
                    completedSegment: null,
                    remainingSegment: null,
                    trackpointKmSeries: []
                },
                cache
            };
        }

        const startDistanceKm = cache.startDist;

        if (startDistanceKm !== null) {
            // Incrementally process new trackpoints to extend the km series and the stateful distance
            if (cache.lastProcessedIndex < relevantHistory.length - 1) {
                let lastValidDistance = cache.lastValidDistance;
                let lastValidSegments = cache.lastValidSegments;
                const newEntries: KmSeriesEntry[] = [];

                for (let i = cache.lastProcessedIndex + 1; i < relevantHistory.length; i++) {
                    const pt = relevantHistory[i];
                    const entryTsMs = normalizeToMs(pt.timestamp);

                    // Hard assert: skip any entry with invalid timestamp
                    if (entryTsMs === null || entryTsMs <= 0 || !Number.isFinite(entryTsMs) || entryTsMs < 1e12 || entryTsMs > 2e12) {
                        console.warn("INVALID tsMs in series — SKIPPING", { index: i, rawTimestamp: pt.timestamp, entryTsMs });
                        continue;
                    }

                    const progress = getRouteProgress(pt.lat, pt.lon);

                    let ptDistanceKm: number;

                    if (progress) {
                        ptDistanceKm = Math.max(0, progress.distanceKm - startDistanceKm);
                        lastValidDistance = progress.distanceKm;
                        lastValidSegments = {
                            completed: progress.completedSegment,
                            remaining: progress.remainingSegment
                        };
                    } else {
                        // Off-route: Use last valid distance
                        ptDistanceKm = Math.max(0, lastValidDistance - startDistanceKm);
                    }

                    newEntries.push({ tsMs: entryTsMs, distanceKm: ptDistanceKm });
                }

                cache = {
                    ...cache,
                    lastValidDistance,
                    lastValidSegments,
                    series: newEntries.length > 0 ? [...cache.series, ...newEntries] : cache.series,
                    lastProcessedIndex: relevantHistory.length - 1
                };
            }

            // Final state is based on the LAST processed point
            distanceKm = Math.max(0, cache.lastValidDistance - startDistanceKm);
            remainingKm = Math.max(0, challengeConfig.plannedDistanceKm - distanceKm);
            completedSegment = distanceKm > 0.005 ? cache.lastValidSegments.completed : null;
            remainingSegment = cache.lastValidSegments.remaining;
        }
    }

    // Use finalDistance from Firestore if available (done state)
    if (challenge.done && challenge.finalDistance) {
        distanceKm = challenge.finalDistance;
        remainingKm = Math.max(0, challengeConfig.plannedDistanceKm - distanceKm);
    }

    // For done/aborted: compute finalDistanceKm from trackpoint series if regular processing didn't produce it
    if (isFinalState && distanceKm === 0 && cache.series.length > 0) {
        // Use the last trackpoint's distance as final
        distanceKm = cache.series[cache.series.length - 1].distanceKm;
        remainingKm = Math.max(0, challengeConfig.plannedDistanceKm - distanceKm);
    }

    // ALWAYS use the last valid segments as fallback — segments must never be null if we've ever computed them
    if (!completedSegment && cache.lastValidSegments.completed) {
        completedSegment = cache.lastValidSegments.completed;
    }
    if (!remainingSegment && cache.lastValidSegments.remaining) {
        remainingSegment = cache.lastValidSegments.remaining;
    }

    // DETERMINISTIC SEGMENT RECONSTRUCTION:
    // If segments are STILL null (e.g. opened /live after challenge ended), reconstruct from distance
    // But ONLY if we actually have the route line loaded
    if (!completedSegment && distanceKm > 0.005 && routeLine) {
        const startDist = cache.startDist ?? 0;
        const absoluteDistKm = startDist + distanceKm;
        const reconstructed = getRouteSegmentsAtDistance(absoluteDistKm);
        if (reconstructed) {
            completedSegment = reconstructed.completed;
            remainingSegment = reconstructed.remaining;
        }
    }

    // Failsafe: if no route line, ensure segments are null
    if (!routeLine) {
        completedSegment = null;
        remainingSegment = null;
    }

    // Elapsed time — FREEZE at finishedAt if done/aborted
    let elapsedMs = 0;
    if (challenge.started && startMs) {
        if (isFinalState && challenge.finishedAt) {
            // Freeze timer at finish time
            const finishedDate = toDateSafe(challenge.finishedAt);
            if (finishedDate) {
                elapsedMs = Math.max(0, finishedDate.getTime() - startMs);
            } else if (nowMs) {
                elapsedMs = Math.max(0, nowMs - startMs);
            }
        } else if (nowMs) {
            elapsedMs = Math.max(0, nowMs - startMs);
        }
    }

    const elapsedHours = elapsedMs / 3600000;
    const elapsedSeconds = elapsedMs / 1000;

    // Average speed after 60s
    if (challenge.started && elapsedSeconds >= 60 && distanceKm > 0) {
        avgSpeedKmh = distanceKm / elapsedHours;
    }

    // Pace
    let paceString = "—";
    if (avgSpeedKmh > 0) {
        const paceMinPerKm = 60 / avgSpeedKmh;
        const paceMins = Math.floor(paceMinPerKm);
        const paceSecs = Math.round((paceMinPerKm - paceMins) * 60);
        paceString = `${paceMins}:${paceSecs.toString().padStart(2, '0')} /km`;
    }

    // ETA
    let etaString = "wird berechnet…";

    if (challenge.done && !challenge.aborted) {
        etaString = "🎉 Im Ziel!";
    } else if (challenge.aborted) {
        etaString = "⚠️ Abgebrochen";
    } else if (distanceKm >= challengeConfig.finishDistanceKm) {
        etaString = "🎉 Im Ziel!";
    } else if (!challenge.started) {
        etaString = "Wartet auf Start...";
    } else if (remainingKm <= 0 && distanceKm > 0) {
        etaString = "Im Ziel!";
    } else if (distanceKm < 0.02) {
        etaString = "ETA nach ersten Metern";
    } else if (avgSpeedKmh > 0 && nowMs) {
        const remainingHours = remainingKm / avgSpeedKmh;
        const targetTime = new Date(nowMs + remainingHours * 3600000);
        const remainingMins = Math.round(remainingHours * 60);

        const hours = Math.floor(remainingMins / 60);
        const mins = remainingMins % 60;
        const timeStr = hours > 0 ? `noch ${hours}h ${mins}m` : `noch ${mins}m`;

        etaString = `Ankunft ca. ${formatClockTime(targetTime)} Uhr (${timeStr})`;
    }

    const result: ChallengeStats = {
        distanceKm,
        remainingKm,
        avgSpeedKmh: challenge.started ? avgSpeedKmh : 0,
        paceString,
        elapsedMs,
        etaString,
        isStarted: challenge.started,
        completedSegment,
        remainingSegment,
        trackpointKmSeries: cache.series
    };

    // Freeze state on done or aborted — all future calls return this.
    // (While not started the cache is reset on every pass, so there is nothing to freeze.)
    if (isFinalState && challenge.started) {
        cache = { ...cache, frozen: result };
    }

    return { stats: result, cache };
}

export function useChallengeStats(
    challenge: ChallengeData,
    location: LocationData | null,
    trackpoints: LocationPoint[],
    nowMs: number | null
): ChallengeStats {
    useEffect(() => {
        prefetchRoute(challengeConfig.routeGeoJsonUrl);
    }, []);

    const routeLine = useRouteLine();
    const [cache, setCache] = useState<StatsCache>(EMPTY_CACHE);

    const { stats, cache: nextCache } = useMemo(
        () => computeStats(cache, challenge, location, trackpoints, nowMs, routeLine),
        [cache, challenge, location, trackpoints, nowMs, routeLine]
    );

    // Store the advanced cache. Calling setState during render is the documented pattern for
    // state derived from previous renders; React re-renders immediately and computeStats
    // returns the same cache object on that pass, so this settles after one extra render.
    if (nextCache !== cache) {
        setCache(nextCache);
    }

    return stats;
}
