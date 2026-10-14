// ═══════════════════════════════════════════════════════════════
// Environment-based Firestore collection path prefixes
// DEV  → challenge_dev/*, dev_locations_dev/*
// PROD → challenge_prod/*, dev_locations_prod/*
// ═══════════════════════════════════════════════════════════════

export function getChallengeBase(): string {
    // Use function to ensure it's evaluated safely at runtime
    // and avoids Next.js Turbopack module-level undefined issues.
    const env = process.env.NEXT_PUBLIC_ENV === "prod" ? "prod" : "dev";
    return env === "prod" ? "challenge_prod" : "challenge_dev";
}

export function getDevLocationsBase(): string {
    const env = process.env.NEXT_PUBLIC_ENV === "prod" ? "prod" : "dev";
    return env === "prod" ? "dev_locations_prod" : "dev_locations_dev";
}

// Boot-time logging — call once from _app.tsx
let _logged = false;
export function logFirestorePaths() {
    if (_logged || typeof window === 'undefined') return;
    _logged = true;
    const env = process.env.NEXT_PUBLIC_ENV || 'dev';
    console.info(
        `[Firestore] ENV=${env} → challenge: "${getChallengeBase()}", locations: "${getDevLocationsBase()}"`
    );
}
