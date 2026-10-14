import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { useTrackpoints } from '../hooks/useTrackpoints';
import { useChallenge } from '../hooks/useChallenge';
import { useChallengeStats } from '../hooks/useChallengeStats';
import { useRouteLine } from '../hooks/useRouteReady';
import { useIsClient } from '../hooks/useIsClient';
import { useNow } from '../hooks/useNow';
import { useThrottledStats } from '../hooks/useThrottledStats';
import { useRouter } from 'next/router';
import { challengeConfig } from '../lib/challengeConfig';
import { formatTime } from '../lib/geo';
import { toDateSafe } from '../lib/time';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap, CircleMarker, Circle, GeoJSON as LeafletGeoJSON } from 'leaflet';
import type { FeatureCollection, LineString } from 'geojson';

const WeatherWidget = dynamic(() => import('../components/WeatherWidget'), { ssr: false });

const inter = Inter({ subsets: ['latin'] });
export default function LivePage() {
    const router = useRouter();
    return <Live key={router.asPath} />;
}

function Live() {
    const mounted = useIsClient();
    const { location, loading, error, isOffline } = useLiveLocation('live');
    const { trackpoints } = useTrackpoints();
    const { challenge } = useChallenge();
    // The clock stops once the challenge is finished; the stats are frozen at that point.
    const now = useNow(challenge.done || challenge.aborted);

    const [isAutoFollowing, setIsAutoFollowing] = useState(true);
    const [statsExpanded, setStatsExpanded] = useState(false);
    const [shareText, setShareText] = useState('Teilen');
    const [celebrationDismissed, setCelebrationDismissed] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<CircleMarker | null>(null);
    const accuracyCircleRef = useRef<Circle | null>(null);
    const completedRouteRef = useRef<LeafletGeoJSON | null>(null);
    const remainingRouteRef = useRef<LeafletGeoJSON | null>(null);
    const baseRouteRef = useRef<LeafletGeoJSON | null>(null);
    const routeBoundsLoaded = useRef(false);
    const introAnimDoneRef = useRef(false);

    const routeLine = useRouteLine();

    useEffect(() => {
        if (mounted && mapRef.current) {
            requestAnimationFrame(() => {
                setTimeout(() => { mapRef.current?.invalidateSize(); }, 0);
            });
        }
    }, [mounted]);

    const {
        distanceKm, remainingKm, avgSpeedKmh, paceString, elapsedMs, etaString,
        completedSegment, remainingSegment
    } = useChallengeStats(challenge, location, trackpoints, now);

    // Throttled display values
    const { displayPace, displaySpeed, displayEta } = useThrottledStats(paceString, avgSpeedKmh, etaString, now);

    // Leaflet map init
    useEffect(() => {
        if (!mounted || typeof window === 'undefined') return;

        (async function initMap() {
            // leaflet.css is imported globally in _app.tsx
            const L = (await import('leaflet')).default;

            if (!mapRef.current) {
                const map = L.map('map', {
                    zoomControl: false,
                    attributionControl: false,
                }).setView([47.8, 16.8], 10);

                mapRef.current = map;
                setMapReady(true);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    maxZoom: 19,
                    subdomains: 'abcd',
                }).addTo(map);

                markerRef.current = L.circleMarker([0, 0], {
                    radius: 8,
                    fillColor: '#10b981',
                    color: '#ffffff',
                    weight: 2.5,
                    opacity: 1,
                    fillOpacity: 1,
                }).addTo(map);

                accuracyCircleRef.current = L.circle([0, 0], {
                    radius: 0,
                    color: '#10b981',
                    weight: 1,
                    fillColor: '#10b981',
                    fillOpacity: 0.1,
                }).addTo(map);

                map.on('dragstart', () => setIsAutoFollowing(false));
            }
        })();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [mounted]);

    // Base route
    useEffect(() => {
        if (!mapReady || !mapRef.current || !routeLine) return;
        if (baseRouteRef.current) return;

        (async () => {
            const L = (await import('leaflet')).default;
            const map = mapRef.current;
            if (!map) return;

            const routeCollection: FeatureCollection<LineString> = { type: 'FeatureCollection', features: [routeLine] };
            baseRouteRef.current = L.geoJSON(
                routeCollection,
                { style: { color: '#111111', weight: 3.5, opacity: 0.8, dashArray: '8, 10' } }
            ).addTo(map);

            if (!routeBoundsLoaded.current && !location) {
                map.fitBounds(baseRouteRef.current.getBounds(), { padding: [50, 50] });
                routeBoundsLoaded.current = true;
            }
        })();
    }, [mapReady, routeLine, location]);

    // Update markers
    useEffect(() => {
        if (!mounted || !mapRef.current || !location) return;

        const { lat, lon, accuracy } = location;

        if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
        if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng([lat, lon]);
            accuracyCircleRef.current.setRadius(accuracy);
            // Fade accuracy ring based on accuracy quality
            const opacity = accuracy < 10 ? 0.05 : accuracy < 30 ? 0.1 : accuracy < 50 ? 0.15 : 0.2;
            accuracyCircleRef.current.setStyle({ fillOpacity: opacity });
        }

        // Cinematic intro
        if (!introAnimDoneRef.current && mapRef.current && markerRef.current) {
            introAnimDoneRef.current = true;
            setIsAutoFollowing(false);

            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.flyTo([lat, lon], 15, { duration: 1.6, easeLinearity: 0.25 });
                    setTimeout(() => {
                        if (mapRef.current) {
                            mapRef.current.setZoom(16, { animate: true });
                            setTimeout(() => setIsAutoFollowing(true), 600);
                        }
                    }, 1800);
                }
            }, 500);
            return;
        }

        if (isAutoFollowing) {
            mapRef.current.setView([lat, lon], mapRef.current.getZoom(), { animate: true, duration: 0.5 });
        }
    }, [location, isAutoFollowing, mounted]);

    // Route segments
    useEffect(() => {
        if (!mounted || !mapRef.current) return;

        (async () => {
            const L = (await import('leaflet')).default;
            const map = mapRef.current;
            if (!map) return;

            if (completedRouteRef.current) { map.removeLayer(completedRouteRef.current); completedRouteRef.current = null; }
            if (remainingRouteRef.current) { map.removeLayer(remainingRouteRef.current); remainingRouteRef.current = null; }

            if (completedSegment) {
                const routeColor = challenge.aborted ? '#ef4444' : (challenge.done ? '#2d9e6a' : '#10b981');
                const routeWeight = (challenge.done || challenge.aborted) ? 7 : 5;
                const glowColor = challenge.aborted ? 'rgba(239, 68, 68, 0.3)' : (challenge.done ? 'rgba(45, 158, 106, 0.35)' : 'rgba(16, 185, 129, 0.25)');
                const glowWeight = (challenge.done || challenge.aborted) ? 20 : 14;

                L.geoJSON(completedSegment, {
                    style: { color: glowColor, weight: glowWeight, opacity: 1, lineCap: 'round', lineJoin: 'round' }
                }).addTo(map);

                completedRouteRef.current = L.geoJSON(completedSegment, {
                    style: { color: routeColor, weight: routeWeight, opacity: 1 }
                }).addTo(map);
            }

            if (remainingSegment) {
                remainingRouteRef.current = L.geoJSON(remainingSegment, {
                    style: { color: '#1a1a1a', weight: 4, opacity: 0.7, dashArray: '6, 8' }
                }).addTo(map);
            }
        })();
    }, [completedSegment, remainingSegment, mounted, challenge.done, challenge.aborted]);

    // Celebration overlay: shown whenever the challenge is done, until dismissed
    const celebrate = challenge.done && !challenge.aborted;
    if (!celebrate && celebrationDismissed) {
        setCelebrationDismissed(false);
    }
    const showCelebration = celebrate && !celebrationDismissed;

    const handleToggleFollow = () => {
        const next = !isAutoFollowing;
        setIsAutoFollowing(next);
        if (next && location && mapRef.current) {
            mapRef.current.setView([location.lat, location.lon], 15, { animate: true });
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: challengeConfig.challengeTitle, text: 'Verfolge uns live bei der 111km Challenge!', url });
                return;
            } catch (err) {
                console.error('Share failed:', err);
            }
        }
        navigator.clipboard.writeText(url);
        setShareText('Kopiert!');
        setTimeout(() => setShareText('Teilen'), 2000);
    };

    if (!mounted) return null;

    const isSuccess = challenge.done && !challenge.aborted;
    const isAborted = challenge.aborted;
    const isFinalState = challenge.done || challenge.aborted;
    const connectionText = isAborted ? 'ABGEBROCHEN' : (isSuccess ? 'GESCHAFFT' : (isOffline ? 'Offline' : (loading ? 'Verbinde...' : (error ? 'Fehler' : 'LIVE'))));
    const isLivePulse = (challenge.started && !isOffline) || isSuccess;
    const goldGradient = { background: 'linear-gradient(90deg, #1a7a4a, #2d9e6a)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const };
    const statColor = isSuccess ? goldGradient : (isAborted ? { color: '#dc2626' } : {});

    // Last update time
    const lastUpdateText = (() => {
        if (!location || !now) return null;
        const secs = Math.floor((now - location.timestamp) / 1000);
        if (secs < 5) return 'gerade eben';
        if (secs < 60) return `vor ${secs}s`;
        return `vor ${Math.floor(secs / 60)}m`;
    })();

    const progressPercent = Math.min(100, (distanceKm / challengeConfig.plannedDistanceKm) * 100);

    return (
        <div className={`${inter.className} live-page`} style={{
            display: 'flex', flexDirection: 'column',
            height: '100dvh', margin: 0,
            backgroundColor: 'var(--bg)', color: 'var(--text-primary)', overflow: 'hidden',
        }}>
            <Head>
                <title>Live Map | {challengeConfig.challengeTitle}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
            </Head>

            {/* ═══ TOP HUD ═══ */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
                padding: 'max(0.75rem, env(safe-area-inset-top, 0.75rem)) 0.75rem 0.75rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                pointerEvents: 'none',
            }}>
                {/* Left: Back + Weather */}
                <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                    <Link href="/" className="btn glass-card" style={{ textDecoration: 'none', gap: '6px', fontSize: '0.8rem', padding: '0.6rem', borderRadius: 'var(--radius-full)', color: 'var(--card-text)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                        <span style={{ display: 'none' }}>{/* hidden on tiny screens */}</span>
                    </Link>
                    <WeatherWidget />
                </div>

                {/* Center: Status */}
                <div style={{ position: 'absolute', top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div className="btn-ghost" style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.45rem 0.9rem', cursor: 'default',
                    }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            backgroundColor: isAborted ? '#ef4444' : (isLivePulse ? '#10b981' : '#f59e0b'),
                            boxShadow: isLivePulse ? '0 0 10px #10b981' : 'none',
                            animation: isLivePulse && !isFinalState ? 'pulse 2s infinite' : 'none',
                        }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', color: isAborted ? '#ef4444' : (isLivePulse ? 'var(--live-status-text)' : 'var(--live-hud-muted)') }}>
                            {connectionText}
                        </span>
                    </div>
                    {lastUpdateText && challenge.started && !isFinalState && (
                        <span style={{
                            fontSize: '0.65rem', color: 'var(--live-badge-text)',
                            background: 'var(--live-badge-bg)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                            padding: '1px 8px', borderRadius: '9999px',
                        }}>
                            {lastUpdateText}
                        </span>
                    )}
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', pointerEvents: 'auto' }}>
                    <button
                        onClick={handleToggleFollow}
                        className={`btn ${isAutoFollowing ? '' : 'glass-card'}`}
                        aria-label={isAutoFollowing ? 'Auto-Follow aktiv' : 'Auto-Follow aus'}
                        style={isAutoFollowing ? {
                            background: '#059669',
                            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                            color: 'white',
                            border: '1px solid rgba(0,0,0,0.08)',
                            padding: '0.45rem 0.85rem', borderRadius: '9999px', fontSize: '0.78rem',
                            fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        } : {
                            padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-full)', fontSize: '0.78rem',
                            fontWeight: 600, color: 'var(--card-text)'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
                        {isAutoFollowing ? 'Tracking' : 'Frei'}
                    </button>
                    <button
                        onClick={handleShare}
                        className="btn glass-card"
                        aria-label="Teilen"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', borderRadius: 'var(--radius-full)', color: 'var(--card-text)', fontWeight: 600 }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                        {shareText}
                    </button>
                </div>
            </div>

            {/* ═══ MAP ═══ */}
            <div id="map" style={{ flexGrow: 1, backgroundColor: '#f8fafc' }} />

            {/* ═══ BOTTOM STATS PANEL ═══ */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, pointerEvents: 'none' }}>
                <div style={{
                    background: 'var(--live-hud-bg)',
                    padding: '1.25rem 1.25rem',
                    paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
                    pointerEvents: 'auto',
                    borderTop: `1px solid var(--live-hud-border)`,
                    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: 'var(--live-hud-shadow)',
                    borderRadius: '1.25rem 1.25rem 0 0',
                }}>
                    {/* Main row */}
                    <div
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', cursor: 'pointer' }}
                        onClick={() => setStatsExpanded(!statsExpanded)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={statsExpanded}
                        aria-label="Stats details"
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatsExpanded(!statsExpanded); } }}
                    >
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--live-hud-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '0.25rem' }}>Seit Start</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, color: 'var(--live-hud-text)', fontVariantNumeric: 'tabular-nums', ...statColor }}>
                                {challenge.started ? formatTime(elapsedMs) : '00:00:00'}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--live-hud-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '0.25rem' }}>Strecke</div>
                            <div style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', ...(isSuccess ? goldGradient : (isAborted ? { color: '#dc2626' } : { color: '#059669' })) }}>
                                {distanceKm.toFixed(1)} <span style={{ fontSize: '0.85rem', color: 'var(--live-hud-muted)', fontWeight: 600 }}>km</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {challenge.started && (
                        <div style={{
                            height: '4px', background: 'var(--live-progress-track)', borderRadius: '9999px',
                            overflow: 'hidden', position: 'relative',
                            marginTop: '0.75rem', marginBottom: statsExpanded ? '0.75rem' : '0',
                        }}>
                            <div
                                className={(challenge.started && !isFinalState) ? "shimmerWalk" : ""}
                                style={{
                                    position: 'absolute', top: 0, left: 0, height: '100%',
                                    width: `${progressPercent}%`,
                                    background: isSuccess ? 'var(--gradient-gold)' : (isAborted ? '#dc2626' : 'var(--gradient-progress)'),
                                    transition: 'width 1s ease-out',
                                    borderRadius: '9999px',
                                }}
                            />
                        </div>
                    )}

                    {/* Expandable stats */}
                    {statsExpanded && (
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem',
                            marginTop: '1rem', borderTop: `1px solid var(--live-hud-border)`, paddingTop: '1rem',
                            animation: 'fadeIn 0.2s ease',
                        }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--live-hud-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Pace</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--live-hud-text)', fontVariantNumeric: 'tabular-nums', ...statColor }}>{displayPace}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--live-hud-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Speed</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--live-hud-text)', fontVariantNumeric: 'tabular-nums', ...statColor }}>{displaySpeed.toFixed(1)} <span style={{ fontSize: '0.8rem', color: 'var(--live-hud-muted)' }}>km/h</span></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--live-hud-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Verbleibend</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--live-hud-text)' }}>{remainingKm.toFixed(1)} <span style={{ fontSize: '0.8rem', color: 'var(--live-hud-muted)' }}>km</span></div>
                            </div>
                            {!isFinalState && (
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--live-hud-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>ETA</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--live-hud-text)' }}>{displayEta}</div>
                                </div>
                            )}
                            {isAborted && (
                                <div style={{
                                    gridColumn: '1 / -1', textAlign: 'center', padding: '0.6rem',
                                    background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)',
                                    border: '1px solid rgba(239, 68, 68, 0.15)',
                                }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>Challenge abgebrochen</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--live-hud-muted)', marginTop: '0.2rem' }}>Kein Teilnehmer mehr aktiv.</div>
                                </div>
                            )}
                            {Boolean(challenge.startTime) && (
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem', fontSize: '0.72rem', color: 'var(--live-hud-muted)', textAlign: 'center' }}>
                                    Start: {toDateSafe(challenge.startTime)?.toLocaleString('de-DE')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Drag handle */}
                    <div
                        style={{ textAlign: 'center', marginTop: statsExpanded ? '0.75rem' : '0.5rem', cursor: 'pointer', padding: '4px 0' }}
                        onClick={() => setStatsExpanded(!statsExpanded)}
                        role="button"
                        tabIndex={0}
                        aria-label={statsExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatsExpanded(!statsExpanded); } }}
                    >
                        <div style={{
                            width: '32px', height: '4px', background: 'var(--live-handle-bg)',
                            borderRadius: '9999px', margin: '0 auto',
                            transition: 'background 0.2s',
                        }} />
                    </div>
                </div>
            </div>

            {/* ═══ CELEBRATION OVERLAY ═══ */}
            {showCelebration && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2000,
                    background: 'linear-gradient(180deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0) 100%)',
                    padding: 'max(2rem, env(safe-area-inset-top, 2rem)) 1rem 2rem', textAlign: 'center',
                    animation: 'fadeIn 0.5s ease',
                }}>
                    <button
                        onClick={() => setCelebrationDismissed(true)}
                        aria-label="Close celebration"
                        style={{
                            position: 'absolute', top: 'max(1rem, env(safe-area-inset-top, 1rem))', right: '1rem',
                            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white', fontSize: '1rem', width: '36px', height: '36px',
                            borderRadius: '50%', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>

                    <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2d9e6a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem', ...goldGradient }}>
                        Challenge geschafft!
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
                        Neusiedlersee {challengeConfig.plannedDistanceKm}km gemeistert
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: '380px', margin: '0 auto' }}>
                        {[
                            { label: 'Strecke', value: `${(challenge.finalDistance || distanceKm).toFixed(1)} km` },
                            { label: 'Zeit', value: formatTime(elapsedMs) },
                            { label: 'Pace', value: paceString },
                            { label: 'Team', value: `${challenge.participants} / 6` },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '0.3rem' }}>{label}</div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', ...goldGradient }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* CSS confetti particles */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                        {Array.from({ length: 30 }).map((_, i) => (
                            <div key={i} style={{
                                position: 'absolute', top: '-10px',
                                left: `${(i * 3.37 + 5) % 100}%`,
                                width: `${6 + (i % 3) * 2}px`,
                                height: `${6 + ((i + 1) % 3) * 2}px`,
                                background: ['#2d9e6a', '#34d399', '#4ECDC4', '#45B7D1', '#96CEB4', '#1a7a4a'][i % 6],
                                borderRadius: i % 2 === 0 ? '50%' : '2px',
                                animation: `confettiFall ${2 + (i % 4) * 0.5}s ease-in ${(i % 6) * 0.25}s forwards`,
                                opacity: 0.9,
                                transform: `rotate(${(i * 47) % 360}deg)`,
                            }} />
                        ))}
                    </div>
                </div>
            )}

            {/* No DEV badge on production live page */}
        </div>
    );
}
