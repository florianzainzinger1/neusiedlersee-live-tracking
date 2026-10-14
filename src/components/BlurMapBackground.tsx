import { useEffect, useRef, useState } from 'react';
import { challengeConfig } from '../lib/challengeConfig';
import { getTimeOfDay, getMapOverlay } from '../lib/timeTheme';
import { useSimulatedTime } from '../hooks/useSimulatedTime';
import { useIsClient } from '../hooks/useIsClient';
import type { Map as LeafletMap } from 'leaflet';

// ═══════════════════════════════════════════════════════════════
// BlurMapBackground — Full-screen blurred Leaflet map backdrop
// Sky blends at top, map reveals at bottom. Scroll increases map contrast.
// z-index: 0 (lowest layer)
// ═══════════════════════════════════════════════════════════════

interface BlurMapBackgroundProps {
    debug?: boolean;
    onReady?: () => void;
}

export default function BlurMapBackground({ debug = false, onReady }: BlurMapBackgroundProps) {
    const mounted = useIsClient();
    const [mapMounted, setMapMounted] = useState(false);
    const [tileCount, setTileCount] = useState(0);
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
    const [scrollFade, setScrollFade] = useState(1);
    const mapRef = useRef<LeafletMap | null>(null);
    const mapScrollRef = useRef<HTMLDivElement>(null);
    // Latest onReady callback; read when the map finishes initializing
    const onReadyRef = useRef(onReady);
    useEffect(() => {
        onReadyRef.current = onReady;
    }, [onReady]);


    const simulatedDate = useSimulatedTime();

    // Overlay based on (simulated) time of day
    const overlay = getMapOverlay(getTimeOfDay(simulatedDate));

    // Scroll-based map reveal + parallax movement
    useEffect(() => {
        if (!mounted) return;
        const handleScroll = () => {
            const vh = window.innerHeight;
            const y = window.scrollY;
            const progress = Math.min(1, y / (vh * 0.8));
            // Overlay opacity goes from 1.0 (top) to 0.15 (scrolled past ~80vh)
            setScrollFade(1 - progress * 0.85);
            // Map parallax: move map up gently with scroll
            if (mapScrollRef.current) {
                mapScrollRef.current.style.transform = `translateY(-${y * 0.15}px)`;
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // initial
        return () => window.removeEventListener('scroll', handleScroll);
    }, [mounted]);

    // Initialize Leaflet map
    useEffect(() => {
        if (!mounted || typeof window === 'undefined') return;

        let cancelled = false;

        (async function initMap() {
            const L = (await import('leaflet')).default;
            if (cancelled || mapRef.current) return;

            const container = document.getElementById('blur-bg-map');
            if (!container) {
                console.error('[BlurMapBackground] #blur-bg-map container not found');
                return;
            }

            const rect = container.getBoundingClientRect();
            setContainerSize({ w: rect.width, h: rect.height });

            if (debug) {
                console.log('[BlurMapBackground] Container size:', rect.width, 'x', rect.height);
            }

            const map = L.map('blur-bg-map', {
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                boxZoom: false,
                keyboard: false,
                touchZoom: false,
                trackResize: false, // Ensure it's purely decorative
            }).setView([47.8, 16.8], 10);

            // Force interaction off on leaflet container
            if (map.getContainer()) {
                map.getContainer().style.pointerEvents = 'none';
            }

            mapRef.current = map;
            setMapMounted(true);
            // Signal ready after a short delay to let tiles begin rendering
            const readyCallback = onReadyRef.current;
            if (readyCallback) {
                setTimeout(readyCallback, 300);
            }

            let tiles = 0;
            const tileLayer = L.tileLayer(
                'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                { maxZoom: 19, subdomains: 'abcd' }
            );
            tileLayer.on('tileload', () => {
                tiles++;
                setTileCount(tiles);
            });
            tileLayer.addTo(map);

            try {
                const res = await fetch(challengeConfig.routeGeoJsonUrl);
                const geojsonData = await res.json();
                L.geoJSON(geojsonData, {
                    style: { color: '#1a7a4a', weight: 8, opacity: 0.9 },
                    interactive: false, // Ensure GeoJSON doesn't capture events
                }).addTo(map);
                map.fitBounds(L.geoJSON(geojsonData).getBounds(), {
                    padding: [100, 100],
                });
                if (debug) console.log('[BlurMapBackground] Route loaded');
            } catch (e) {
                console.error('[BlurMapBackground] Error loading route geojson:', e);
            }
        })();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [mounted, debug]);

    if (!mounted) return null;

    return (
        <>
            {/* z-index: 0 — Map layer */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100%',
                    zIndex: 0,
                    pointerEvents: 'none',
                    overflow: 'hidden',
                    ...(debug ? { outline: '3px solid red' } : {}),
                }}
            >
                {/* Scroll-driven parallax wrapper */}
                <div
                    ref={mapScrollRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '130vh',
                        pointerEvents: 'none',
                        willChange: 'transform',
                    }}
                >
                    {/* The actual Leaflet map */}
                    <div
                        id="blur-bg-map"
                        className="ff-degrade-blur"
                        style={{
                            width: '100%',
                            height: '100%',
                            filter: 'blur(3px) saturate(1.15) brightness(0.78)',
                            transform: 'scale(1.06)',
                            animation: 'slowDrift 80s ease-in-out infinite',
                            pointerEvents: 'none',
                        }}
                    />
                </div>
            </div>

            {/* z-index: 1 — Gradient overlay: sky-blended top → transparent bottom */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100%',
                    zIndex: 1,
                    pointerEvents: 'none',
                    background: overlay,
                    opacity: scrollFade,
                    transition: 'background 2s ease, opacity 0.15s ease-out',
                    ...(debug ? { outline: '3px solid blue' } : {}),
                }}
            />

            {/* Debug overlay */}
            {debug && (
                <div
                    style={{
                        position: 'fixed',
                        top: 10,
                        right: 10,
                        zIndex: 9999,
                        background: 'rgba(0,0,0,0.85)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#fff',
                        lineHeight: 1.6,
                        pointerEvents: 'none', // Fix debug overlay blocking clicks!
                    }}
                >
                    <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: 4 }}>MAP DEBUG</div>
                    <div>mapMounted: <span style={{ color: mapMounted ? '#4ade80' : '#f87171' }}>{String(mapMounted)}</span></div>
                    <div>container: {containerSize.w}x{containerSize.h}</div>
                    <div>tiles loaded: {tileCount}</div>
                    <div>scrollFade: {scrollFade.toFixed(2)}</div>
                    <div style={{ color: '#fbbf24', marginTop: 4 }}>Pointer Events: OFF</div>
                    <div style={{ color: '#fbbf24' }}>Wheel Zoom: OFF</div>
                </div>
            )}
        </>
    );
}
