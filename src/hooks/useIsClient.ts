import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/**
 * false during server rendering and hydration, true afterwards.
 * Replaces the `useEffect(() => setMounted(true), [])` pattern for client-only rendering.
 */
export function useIsClient(): boolean {
    return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
