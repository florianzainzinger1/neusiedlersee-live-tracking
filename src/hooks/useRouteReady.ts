import { useEffect, useSyncExternalStore } from 'react';
import { isRouteReady, subscribeRouteReady, prefetchRoute, getRouteLine, type RouteLine } from '../lib/geo';
import { challengeConfig } from '../lib/challengeConfig';

/**
 * Hook that tracks whether the GPX route has been loaded.
 * Ensures component re-renders when route finishes loading.
 */
export function useRouteReady(): boolean {
    useEffect(() => {
        prefetchRoute(challengeConfig.routeGeoJsonUrl);
    }, []);

    return useSyncExternalStore(
        subscribeRouteReady,
        () => isRouteReady(),
        () => isRouteReady()
    );
}

/**
 * Hook that returns the actual GeoJSON route line.
 * Re-renders when the route finishes loading.
 */
export function useRouteLine(): RouteLine | null {
    useEffect(() => {
        prefetchRoute(challengeConfig.routeGeoJsonUrl);
    }, []);

    return useSyncExternalStore(
        subscribeRouteReady,
        () => getRouteLine(),
        () => getRouteLine()
    );
}
