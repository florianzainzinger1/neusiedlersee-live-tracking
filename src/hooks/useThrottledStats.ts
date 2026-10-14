import { useState } from 'react';

const PACE_INTERVAL_MS = 5000;
const ETA_INTERVAL_MS = 30000;

interface ThrottledStats {
    paceAt: number;
    etaAt: number;
    pace: string;
    speed: number;
    eta: string;
}

const isPlaceholderPace = (str: string) => str === "\u2014";
const isPlaceholderEta = (str: string) => str.includes("wird berechnet") || str.includes("Warte") || str.includes("ersten Metern");

/**
 * Throttles the displayed pace/speed (every 5 s) and ETA (every 30 s) so the numbers
 * do not flicker on every GPS update. Placeholders are replaced by real values immediately.
 */
export function useThrottledStats(paceString: string, avgSpeedKmh: number, etaString: string, now: number | null) {
    const [state, setState] = useState<ThrottledStats>(() => ({
        paceAt: 0,
        etaAt: 0,
        pace: paceString,
        speed: avgSpeedKmh,
        eta: etaString,
    }));

    let next = state;
    const stamp = now ?? 0;

    const needsImmediatePace = isPlaceholderPace(state.pace) && !isPlaceholderPace(paceString);
    if (now === null || now - state.paceAt >= PACE_INTERVAL_MS || needsImmediatePace) {
        if (next.pace !== paceString || next.speed !== avgSpeedKmh || next.paceAt !== stamp) {
            next = { ...next, paceAt: stamp, pace: paceString, speed: avgSpeedKmh };
        }
    }

    const needsImmediateEta = isPlaceholderEta(state.eta) && !isPlaceholderEta(etaString);
    if (now === null || now - state.etaAt >= ETA_INTERVAL_MS || needsImmediateEta) {
        if (next.eta !== etaString || next.etaAt !== stamp) {
            next = { ...next, etaAt: stamp, eta: etaString };
        }
    }

    // Derived-from-previous-render state: update during render instead of in an effect.
    if (next !== state) {
        setState(next);
    }

    return { displayPace: next.pace, displaySpeed: next.speed, displayEta: next.eta };
}
