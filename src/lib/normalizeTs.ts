/**
 * Robust timestamp normalizer.
 * Handles: number (ms or s), string digits, Firestore Timestamp objects.
 * Returns ms since epoch or null if invalid.
 */
export function normalizeToMs(value: unknown): number | null {
    if (value === null || value === undefined) return null;

    if (typeof value === 'object') {
        const ts = value as { toMillis?: unknown; seconds?: unknown; nanoseconds?: unknown };

        // Firestore Timestamp object with toMillis()
        if (typeof ts.toMillis === 'function') {
            return (ts as { toMillis: () => number }).toMillis();
        }

        // Firestore Timestamp-like { seconds, nanoseconds }
        if (typeof ts.seconds === 'number') {
            const nanos = typeof ts.nanoseconds === 'number' ? ts.nanoseconds : 0;
            const ms = ts.seconds * 1000 + Math.floor(nanos / 1e6);
            return ms;
        }
    }

    // String of digits
    if (typeof value === 'string') {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
        return null;
    }

    // Plain number
    if (typeof value === 'number' && Number.isFinite(value)) {
        // If it looks like seconds (< 1e12), convert to ms
        if (value > 0 && value < 1e12) return value * 1000;
        return value;
    }

    return null;
}

/**
 * Validates that a timestamp is a plausible ms-since-epoch value.
 * Must be between 1e12 (Sep 2001) and 2e12 (May 2033).
 */
export function isValidMsTimestamp(ms: number): boolean {
    return Number.isFinite(ms) && ms > 1e12 && ms < 2e12;
}
