// ═══════════════════════════════════════════════════════════════
// Time Theme — Central time-of-day calculations for theming
// ═══════════════════════════════════════════════════════════════

export type TimeOfDay = 'morning' | 'day' | 'sunset' | 'night';

/** Period boundaries (24h) */
const PERIODS: Record<TimeOfDay, [number, number]> = {
    morning: [5, 9],
    day: [9, 17],
    sunset: [17, 21],
    night: [21, 29], // wraps past midnight: 21–05 (29 = 5+24)
};

/** Determine the current period from a Date */
export function getTimeOfDay(date: Date): TimeOfDay {
    const hour = date.getHours();
    if (hour >= 5 && hour < 9) return 'morning';
    if (hour >= 9 && hour < 17) return 'day';
    if (hour >= 17 && hour < 21) return 'sunset';
    return 'night';
}

/** Map TimeOfDay → body CSS class */
export function getBodyThemeClass(tod: TimeOfDay): string {
    return `theme-${tod}`;
}

/**
 * Progress 0..1 within the current period.
 * E.g. at 13:00 during day (9–17), progress ≈ 0.5
 */
export function getPeriodProgress(date: Date): number {
    const tod = getTimeOfDay(date);
    const [start, end] = PERIODS[tod];
    const duration = end - start;

    let hour = date.getHours() + date.getMinutes() / 60;

    // For night period: if hour < start (i.e. 0–5), add 24 to normalize
    if (tod === 'night' && hour < start) {
        hour += 24;
    }

    return Math.max(0, Math.min(1, (hour - start) / duration));
}

/** Celestial body type */
export function getCelestialType(tod: TimeOfDay): 'sun' | 'moon' {
    return tod === 'night' ? 'moon' : 'sun';
}

/** Sky background gradient — the actual "sky" color behind everything */
export function getSkyGradient(tod: TimeOfDay): string {
    switch (tod) {
        case 'morning':
            return 'linear-gradient(180deg, #8ec5fc 0%, #c4ddf7 40%, #fde1c4 80%, #f7e6d5 100%)';
        case 'day':
            return 'linear-gradient(180deg, #4a90c4 0%, #6aabe0 30%, #8bc4ee 60%, #a8d8f5 100%)';
        case 'sunset':
            return 'linear-gradient(180deg, #2d1b69 0%, #8b3a62 25%, #e8734a 55%, #f5b041 80%, #f7d794 100%)';
        case 'night':
            return 'linear-gradient(180deg, #0a0e27 0%, #1a1a3e 30%, #1e2d50 60%, #243b5e 100%)';
    }
}

/** Vertical gradient overlay: strong at top (sky blends), transparent at bottom (map reveals) */
export function getMapOverlay(tod: TimeOfDay): string {
    switch (tod) {
        case 'morning':
            return 'linear-gradient(to bottom, rgba(180,215,250,0.95) 0%, rgba(180,215,250,0.95) 25%, rgba(200,225,250,0.7) 38%, rgba(220,235,250,0.3) 52%, transparent 68%)';
        case 'day':
            return 'linear-gradient(to bottom, rgba(74,144,196,0.95) 0%, rgba(74,144,196,0.95) 25%, rgba(106,171,224,0.7) 40%, rgba(160,210,240,0.3) 55%, transparent 72%)';
        case 'sunset':
            return 'linear-gradient(to bottom, rgba(45,27,105,0.95) 0%, rgba(45,27,105,0.95) 25%, rgba(100,45,75,0.6) 38%, rgba(140,65,55,0.2) 52%, transparent 68%)';
        case 'night':
            return 'linear-gradient(to bottom, rgba(10,14,39,0.97) 0%, rgba(10,14,39,0.97) 25%, rgba(15,22,48,0.7) 38%, rgba(22,32,58,0.3) 52%, transparent 68%)';
    }
}

/** Celestial body glow colors */
export function getCelestialColors(tod: TimeOfDay): {
    core: string;
    glow: string;
    size: number;
    glowSize: number;
} {
    switch (tod) {
        case 'morning':
            return {
                core: 'rgba(255, 210, 100, 0.95)',
                glow: 'rgba(255, 180, 50, 0.25)',
                size: 60,
                glowSize: 200,
            };
        case 'day':
            return {
                core: 'rgba(255, 230, 120, 0.9)',
                glow: 'rgba(255, 220, 80, 0.2)',
                size: 70,
                glowSize: 240,
            };
        case 'sunset':
            return {
                core: 'rgba(255, 140, 50, 0.95)',
                glow: 'rgba(255, 100, 30, 0.3)',
                size: 80,
                glowSize: 260,
            };
        case 'night':
            return {
                core: 'rgba(210, 220, 245, 0.85)',
                glow: 'rgba(160, 190, 255, 0.18)',
                size: 50,
                glowSize: 160,
            };
    }
}

/**
 * Compute celestial body position (percentage of viewport).
 * x: moves left (10%) → right (90%) with progress.
 * y: follows a gentle parabolic arc (higher at mid-progress).
 */
export function getCelestialPosition(progress: number): { x: number; y: number } {
    const x = 10 + progress * 80; // 10% to 90%
    // Parabolic arc: peaks at progress=0.5, y ranges from ~25% (edges) to ~8% (peak)
    const y = 25 - 17 * Math.sin(progress * Math.PI);
    return { x, y };
}
