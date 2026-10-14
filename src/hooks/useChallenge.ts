import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getChallengeBase } from "../lib/envBasePath";
import type { TimestampLike } from "../lib/time";

export interface ChallengeData {
    started: boolean;
    startTime: TimestampLike | null;
    startLat: number | null;
    startLon: number | null;
    participants: number;
    startDistance: number | null;
    done: boolean;
    aborted: boolean;
    finishedAt: TimestampLike | null;
    finalDistance: number | null;
}

export function useChallenge() {
    const [challenge, setChallenge] = useState<ChallengeData>({
        started: false,
        startTime: null,
        startLat: null,
        startLon: null,
        participants: 6,
        startDistance: null,
        done: false,
        aborted: false,
        finishedAt: null,
        finalDistance: null
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // loading starts as true and error as null; the listener callbacks update them.
        const docRef = doc(db, getChallengeBase(), "live");

        const unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setChallenge({
                        started: !!data.started,
                        startTime: data.startTime || null,
                        startLat: typeof data.startLat === 'number' ? data.startLat : null,
                        startLon: typeof data.startLon === 'number' ? data.startLon : null,
                        participants: typeof data.participants === 'number' ? data.participants : 6,
                        startDistance: typeof data.startDistance === 'number' ? data.startDistance : null,
                        done: !!data.done,
                        aborted: !!data.aborted,
                        finishedAt: data.finishedAt || null,
                        finalDistance: typeof data.finalDistance === 'number' ? data.finalDistance : null
                    });
                } else {
                    setChallenge({
                        started: false,
                        startTime: null,
                        startLat: null,
                        startLon: null,
                        participants: 6,
                        startDistance: null,
                        done: false,
                        aborted: false,
                        finishedAt: null,
                        finalDistance: null
                    });
                }
                setLoading(false);
            },
            (err) => {
                console.error("useChallenge Firestore error", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { challenge, loading, error };
}
