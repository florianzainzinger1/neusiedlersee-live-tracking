import { useSyncExternalStore } from 'react';

// One shared clock for all components that display live times.
const listeners = new Set<() => void>();
let current: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (timer === null) {
        timer = setInterval(() => {
            current = Date.now();
            listeners.forEach(l => l());
        }, 1000);
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== null) {
            clearInterval(timer);
            timer = null;
            current = null;
        }
    };
}

function getSnapshot(): number {
    if (current === null) current = Date.now();
    return current;
}

const getServerSnapshot = (): number | null => null;
const noopSubscribe = () => () => {};

/**
 * Current time in ms, updated once per second on the client.
 * Returns null during server rendering and hydration.
 * With `paused`, the component stops re-rendering on clock ticks.
 */
export function useNow(paused = false): number | null {
    return useSyncExternalStore(paused ? noopSubscribe : subscribe, getSnapshot, getServerSnapshot);
}
