/**
 * Robust Timestamp & Date Utilities
 */

/**
 * Any timestamp shape that may come out of Firestore or JS:
 * Firestore Timestamp, serialized { seconds, nanoseconds }, ms number, date string or Date.
 */
export type TimestampLike = unknown;

function hasToDate(value: object): value is { toDate: () => Date } {
    return typeof (value as { toDate?: unknown }).toDate === 'function';
}

/**
 * Safely converts various Firestore or JS timestamp formats into a valid Date object.
 * Returns null if the value is invalid or null.
 */
export function toDateSafe(value: TimestampLike): Date | null {
    if (!value) return null;

    // Firestore Timestamp (has toDate method)
    if (typeof value === 'object' && hasToDate(value)) {
        return value.toDate();
    }

    // Firestore legacy/serialzed { seconds, nanoseconds }
    if (typeof value === 'object' && 'seconds' in value) {
        return new Date((value as { seconds: number }).seconds * 1000);
    }

    // JS Number (milliseconds)
    if (typeof value === 'number') {
        return new Date(value);
    }

    // ISO String or other date string forms
    if (typeof value === 'string') {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
    }

    // Already a date
    if (value instanceof Date && !isNaN(value.getTime())) {
        return value;
    }

    return null;
}

/**
 * Formats a given Date or timestamp into a German human-readable relative time string.
 */
export function formatLastUpdate(value: TimestampLike, nowMs: number): string {
    const date = toDateSafe(value);
    if (!date) return 'Warte auf Signal...';

    const diffSec = Math.floor((nowMs - date.getTime()) / 1000);

    if (diffSec < 60) return 'gerade eben';

    const diffMins = Math.floor(diffSec / 60);
    if (diffMins === 1) return 'vor 1 Minute';
    if (diffMins < 60) return `vor ${diffMins} Minuten`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'vor 1 Stunde';
    if (diffHours < 24) return `vor ${diffHours} Stunden`;

    // Fallback for > 24 hours
    return `am ${date.toLocaleDateString('de-DE')}`;
}

/**
 * Formats a Date objects strictly into HH:MM (e.g. "18:40")
 */
export function formatClockTime(value: TimestampLike): string {
    const date = toDateSafe(value);
    if (!date) return '--:--';
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formats a Date object strictly into DD.MM.YYYY HH:MM (e.g. "01.03.2026 06:00")
 */
export function formatDateTime(value: TimestampLike): string {
    const date = toDateSafe(value);
    if (!date) return '--.--.---- --:--';

    const d = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const t = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    return `${d} ${t}`;
}
