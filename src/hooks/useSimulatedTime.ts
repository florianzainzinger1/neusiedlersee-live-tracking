import { useState, useEffect } from "react";

/**
 * Parses a ?time=HH:MM query parameter from the URL to return a fake Date.
 * If no parameter is found, returns the real current Date.
 */
export function useSimulatedTime(): Date {
    const [simulatedDate, setSimulatedDate] = useState<Date>(new Date());

    useEffect(() => {
        const updateTime = () => {
            const params = new URLSearchParams(window.location.search);
            const timeParam = params.get("time");

            if (timeParam) {
                // Parse "HH:MM" (e.g. "08:30", "18:00")
                const match = timeParam.match(/^(\d{1,2}):(\d{2})$/);
                if (match) {
                    const hours = parseInt(match[1], 10);
                    const minutes = parseInt(match[2], 10);

                    const fakeDate = new Date();
                    fakeDate.setHours(hours, minutes, 0, 0);
                    setSimulatedDate(fakeDate);
                    return;
                }
            }

            // Fallback to real time
            setSimulatedDate(new Date());
        };

        // Initial set
        updateTime();

        // If not simulating, keep ticking real time
        const interval = setInterval(() => {
            const params = new URLSearchParams(window.location.search);
            if (!params.get("time")) {
                setSimulatedDate(new Date());
            }
        }, 10000); // update every 10s

        return () => clearInterval(interval);
    }, []);

    return simulatedDate;
}
