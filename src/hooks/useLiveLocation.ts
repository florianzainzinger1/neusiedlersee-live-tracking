import { useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getDevLocationsBase } from "../lib/envBasePath";

export interface LocationData {
    lat: number;
    lon: number;
    accuracy: number;
    timestamp: number;
}

export interface UseLiveLocationResult {
    location: LocationData | null;
    locationHistory: LocationData[];
    loading: boolean;
    error: Error | null;
    isOffline: boolean;
}

export function useLiveLocation(deviceId: string): UseLiveLocationResult {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
    const historyRef = useRef<LocationData[]>([]);
    const lastProcessedTimestampRef = useRef<number>(0);
    // Loading/error are tracked per device ID, so switching IDs starts out "loading" again
    // without having to reset state synchronously inside the effect.
    const [settledId, setSettledId] = useState<string | null>(null);
    const [errorState, setErrorState] = useState<{ deviceId: string; error: Error } | null>(null);
    const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    useEffect(() => {
        if (!deviceId) return;

        const docRef = doc(db, getDevLocationsBase(), deviceId);

        const unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const newLoc: LocationData = {
                        lat: data.lat,
                        lon: data.lon,
                        accuracy: data.accuracy || 0,
                        timestamp: data.timestamp || Date.now()
                    };

                    // Reject inaccurate GPS (>100m)
                    if (newLoc.accuracy > 100) {
                        setSettledId(deviceId);
                        return;
                    }

                    // Require a NEW timestamp
                    if (newLoc.timestamp === lastProcessedTimestampRef.current) {
                        setSettledId(deviceId);
                        return;
                    }

                    lastProcessedTimestampRef.current = newLoc.timestamp;

                    const prev = historyRef.current;
                    const newHistory = [...prev, newLoc].slice(-500);
                    historyRef.current = newHistory;
                    setLocationHistory(newHistory);
                    setLocation(newLoc);
                    setErrorState(null);
                } else {
                    setLocation(null);
                }
                setSettledId(deviceId);
            },
            (err) => {
                console.error("Firestore Error:", err);
                setErrorState({ deviceId, error: err });
                setSettledId(deviceId);
            }
        );

        return () => unsubscribe();
    }, [deviceId]);

    const loading = deviceId ? settledId !== deviceId : false;
    const error = errorState && errorState.deviceId === deviceId ? errorState.error : null;

    return { location, locationHistory, loading, error, isOffline };
}
