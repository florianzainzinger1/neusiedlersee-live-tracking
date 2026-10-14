import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useLiveLocation } from '../../hooks/useLiveLocation';
import type { Map as LeafletMap, Marker, Circle } from 'leaflet';

const DEVICE_ID = process.env.NEXT_PUBLIC_TRACKER_DEVICE_ID ?? '';

export default function View() {
    const [mounted, setMounted] = useState(false);

    // Mount effect must run first
    useEffect(() => {
        setMounted(true);
    }, []);

    const { location, loading, error, isOffline } = useLiveLocation(DEVICE_ID);

    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<Marker | null>(null);
    const circleRef = useRef<Circle | null>(null);

    const [follow, setFollow] = useState(true);
    const [now, setNow] = useState<number | null>(null);
    const [initialCenterDone, setInitialCenterDone] = useState(false);

    // Force render every second for the "seconds ago" timer, but only on client
    useEffect(() => {
        if (!mounted) return;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [mounted]);

    // Initialize Map Options separately
    useEffect(() => {
        if (!mounted || !mapContainer.current) return;
        let isActive = true;

        (async () => {
            const leaflet = await import('leaflet');
            if (!isActive || mapRef.current) return;
            const L = leaflet.default || leaflet;

            // Fix default icons
            delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const map = L.map(mapContainer.current!).setView([0, 0], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            map.on('dragstart', () => {
                setFollow(false);
            });

            mapRef.current = map;
        })();

        return () => {
            isActive = false;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            markerRef.current = null;
            circleRef.current = null;
        };
    }, [mounted]);

    // Handle updates when location changes
    useEffect(() => {
        if (!mounted || !location || !mapRef.current) return;

        import('leaflet').then(leaflet => {
            const L = leaflet.default || leaflet;
            const latlng: [number, number] = [location.lat, location.lon];

            if (!markerRef.current) {
                markerRef.current = L.marker(latlng).addTo(mapRef.current!);
                circleRef.current = L.circle(latlng, { radius: location.accuracy }).addTo(mapRef.current!);
            } else {
                markerRef.current.setLatLng(latlng);
                circleRef.current!.setLatLng(latlng);
                circleRef.current!.setRadius(location.accuracy);
            }

            if (!initialCenterDone) {
                mapRef.current!.setView(latlng, 16, { animate: true });
                setInitialCenterDone(true);
            } else if (follow) {
                mapRef.current!.setView(latlng, mapRef.current!.getZoom(), { animate: true });
            }
        });
    }, [location, follow, initialCenterDone, mounted]);

    const toggleFollow = () => {
        setFollow(prev => {
            const next = !prev;
            if (next && location && mapRef.current) {
                mapRef.current.setView([location.lat, location.lon], mapRef.current.getZoom(), { animate: true });
            }
            return next;
        });
    };

    // Return null during SSR to prevent hydration errors
    if (!mounted) return null;

    const secondsAgo = location && now ? Math.floor((now - location.timestamp) / 1000) : null;
    const statusText = isOffline ? 'Offline' : (loading ? 'Connecting...' : (error ? 'Error' : 'Connected'));
    const statusColor = isOffline ? '#ef4444' : (loading ? '#f59e0b' : (error ? '#ef4444' : '#10b981'));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: 0, fontFamily: 'sans-serif' }}>
            <Head>
                <title>Live GPS Tracking</title>
            </Head>

            {/* Info Panel */}
            <div style={{ padding: '15px 20px', background: '#1e293b', color: 'white', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', zIndex: 1000 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>Live Tracking</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }}></div>
                            <span style={{ color: '#cbd5e1' }}>{statusText}</span>
                        </div>
                    </div>

                    {location && (
                        <div style={{ display: 'flex', gap: '20px', borderLeft: '1px solid #334155', paddingLeft: '20px' }}>
                            <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coordinates</div>
                                {location.lat.toFixed(5)}, {location.lon.toFixed(5)}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accuracy</div>
                                ~{Math.round(location.accuracy)}m
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Update</div>
                                {secondsAgo !== null && secondsAgo >= 0 ? `${secondsAgo}s ago` : 'Just now'}
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={toggleFollow}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        background: follow ? '#3b82f6' : '#475569',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        transition: 'background-color 0.2s'
                    }}
                >
                    {follow ? '🎯 Auto-Follow ON' : 'Auto-Follow OFF'}
                </button>
            </div>

            {/* States and Map Container */}
            <div style={{ position: 'relative', flex: 1, width: '100%', background: '#f1f5f9' }}>
                {/* Overlays for loading / errors / waiting */}
                {!location && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)' }}>
                        <div style={{ padding: '20px 40px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
                            {loading && <h3 style={{ color: '#0f172a', margin: 0 }}>Connecting to session...</h3>}
                            {!loading && !error && !isOffline && <h3 style={{ color: '#0f172a', margin: 0 }}>Waiting for location updates from phone...</h3>}
                            {isOffline && <h3 style={{ color: '#ef4444', margin: 0 }}>You are offline. Please check connection.</h3>}
                            {error && <h3 style={{ color: '#ef4444', margin: 0 }}>Error: {error.message}</h3>}
                        </div>
                    </div>
                )}

                <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    );
}
