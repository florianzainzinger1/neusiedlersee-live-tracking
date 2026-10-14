import { useState, useEffect, useRef } from 'react';

interface WeatherData {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    weatherCode: number;
}

// Neusiedlersee coordinates
const LAKE_LAT = 47.8;
const LAKE_LON = 16.8;
const CACHE_KEY = 'weather_cache';
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function windDegToDirection(deg: number): string {
    const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
}

function getWeatherIcon(code: number): string {
    // WMO Weather Interpretation Codes
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 57) return '🌧️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '🌨️';
    if (code <= 82) return '🌧️';
    if (code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '☁️';
}

function WindArrow({ direction }: { direction: number }) {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
                transform: `rotate(${direction + 180}deg)`,
                transition: 'transform 0.5s ease',
                opacity: 0.6,
            }}
        >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
        </svg>
    );
}

/** Weather from localStorage if it is younger than CACHE_DURATION_MS. */
function readCachedWeather(): WeatherData | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached) as { data: WeatherData; timestamp: number };
            if (Date.now() - timestamp < CACHE_DURATION_MS) {
                return data;
            }
        }
    } catch { /* ignore cache errors */ }
    return null;
}

export default function WeatherWidget() {
    // Rendered client-only (dynamic import with ssr: false), so the cache can be read on first render
    const [weather, setWeather] = useState<WeatherData | null>(readCachedWeather);
    const [loading, setLoading] = useState(() => weather === null);
    const fetchedRef = useRef(false);
    const needsFetch = loading;

    useEffect(() => {
        if (!needsFetch || fetchedRef.current) return;
        fetchedRef.current = true;

        // Fetch from Open-Meteo (free, no API key required)
        fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${LAKE_LAT}&longitude=${LAKE_LON}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&timezone=Europe%2FVienna`
        )
            .then(res => res.json())
            .then(data => {
                if (data.current) {
                    const weatherData: WeatherData = {
                        temperature: Math.round(data.current.temperature_2m),
                        windSpeed: Math.round(data.current.wind_speed_10m),
                        windDirection: data.current.wind_direction_10m,
                        weatherCode: data.current.weather_code,
                    };
                    setWeather(weatherData);
                    // Cache the result
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify({
                            data: weatherData,
                            timestamp: Date.now(),
                        }));
                    } catch { /* ignore storage errors */ }
                }
            })
            .catch(err => console.warn('Weather fetch failed:', err))
            .finally(() => setLoading(false));
    }, [needsFetch]);

    if (loading || !weather) return null;

    return (
        <div
            className="glass-card"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--card-text)',
                opacity: 0,
                animation: 'fadeIn 0.5s ease 0.8s both',
            }}
        >
            {/* Weather icon */}
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>
                {getWeatherIcon(weather.weatherCode)}
            </span>

            {/* Temperature */}
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {weather.temperature}°C
            </span>

            {/* Separator */}
            <span style={{ opacity: 0.25 }}>|</span>

            {/* Wind */}
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontVariantNumeric: 'tabular-nums',
            }}>
                <WindArrow direction={weather.windDirection} />
                {weather.windSpeed} km/h
                <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>
                    {windDegToDirection(weather.windDirection)}
                </span>
            </span>
        </div>
    );
}
