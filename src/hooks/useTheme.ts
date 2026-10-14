import { useEffect } from 'react';
import { getTimeOfDay, getBodyThemeClass } from '../lib/timeTheme';
import { useSimulatedTime } from '../hooks/useSimulatedTime';

export type TimeTheme = 'theme-morning' | 'theme-day' | 'theme-sunset' | 'theme-night';

export function useTheme() {
    const simulatedDate = useSimulatedTime();

    useEffect(() => {
        // Skip on server
        if (typeof document === 'undefined') return;

        const tod = getTimeOfDay(simulatedDate);
        const cls = getBodyThemeClass(tod);

        // Ensure body only ever has one theme class
        document.body.classList.remove('theme-morning', 'theme-day', 'theme-sunset', 'theme-night');
        document.body.classList.add(cls);
    }, [simulatedDate]);
}
