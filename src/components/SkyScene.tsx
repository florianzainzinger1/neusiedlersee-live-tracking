import { useEffect, useMemo, useRef } from 'react';
import {
    getTimeOfDay,
    getPeriodProgress,
    getCelestialPosition,
    getSkyGradient,
} from '../lib/timeTheme';
import { useSimulatedTime } from '../hooks/useSimulatedTime';
import { useIsClient } from '../hooks/useIsClient';

// ═══════════════════════════════════════════════════════════════
// SkyScene — Atmospheric layer: sky gradient, cartoon Sun/Moon, clouds, stars
// Rendered above the map (z-index: 2), below the readability overlay.
// Cartoon/flat style for all celestial elements.
// ═══════════════════════════════════════════════════════════════

/** Deterministic star positions */
function generateStars(count: number) {
    const stars: Array<{ x: number; y: number; size: number; opacity: number; delay: number }> = [];
    let seed = 42;
    const rand = () => {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
        stars.push({
            x: rand() * 100,
            y: rand() * 55,
            size: 1 + rand() * 2,
            opacity: 0.2 + rand() * 0.5,
            delay: rand() * 8,
        });
    }
    return stars;
}

/** Cartoon Sun SVG */
function CartoonSun({ size }: { size: number }) {
    const r = size / 2;
    const rayLen = size * 0.35;
    const rayCount = 8;
    return (
        <svg width={size + rayLen * 2} height={size + rayLen * 2} viewBox={`0 0 ${size + rayLen * 2} ${size + rayLen * 2}`} style={{ display: 'block' }}>
            {/* Rays */}
            {Array.from({ length: rayCount }).map((_, i) => {
                const angle = (i * 360) / rayCount;
                const rad = (angle * Math.PI) / 180;
                const cx = r + rayLen;
                const cy = r + rayLen;
                const x1 = cx + Math.cos(rad) * (r + 4);
                const y1 = cy + Math.sin(rad) * (r + 4);
                const x2 = cx + Math.cos(rad) * (r + rayLen);
                const y2 = cy + Math.sin(rad) * (r + rayLen);
                return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="#FFD93D" strokeWidth={3} strokeLinecap="round" />
                );
            })}
            {/* Sun body */}
            <circle cx={r + rayLen} cy={r + rayLen} r={r} fill="#FFD93D" />
            {/* Highlight */}
            <circle cx={r + rayLen - r * 0.25} cy={r + rayLen - r * 0.25} r={r * 0.35} fill="#FFED8A" opacity={0.7} />
        </svg>
    );
}

/** Cartoon Moon SVG — clean crescent via mask */
function CartoonMoon({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 60 60" style={{ display: 'block' }}>
            <defs>
                <mask id="crescent-mask">
                    <rect width="60" height="60" fill="white" />
                    <circle cx="40" cy="24" r="18" fill="black" />
                </mask>
            </defs>
            {/* Moon body with crescent cutout */}
            <circle cx="30" cy="30" r="24" fill="#F0E68C" mask="url(#crescent-mask)" />
            {/* Craters */}
            <circle cx="22" cy="34" r="3" fill="#E6D86E" opacity={0.5} mask="url(#crescent-mask)" />
            <circle cx="28" cy="42" r="2" fill="#E6D86E" opacity={0.4} mask="url(#crescent-mask)" />
            <circle cx="18" cy="26" r="2.5" fill="#E6D86E" opacity={0.35} mask="url(#crescent-mask)" />
        </svg>
    );
}

/** Cartoon Cloud SVG — flat, rounded, no blur */
function CartoonCloud({ width, height }: { width: number; height: number }) {
    // Proportional cloud built from overlapping ellipses
    const w = width;
    const h = height;
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
            {/* Main body */}
            <ellipse cx={w * 0.5} cy={h * 0.65} rx={w * 0.4} ry={h * 0.3} fill="white" />
            {/* Left bump */}
            <ellipse cx={w * 0.28} cy={h * 0.55} rx={w * 0.22} ry={h * 0.28} fill="white" />
            {/* Right bump */}
            <ellipse cx={w * 0.7} cy={h * 0.5} rx={w * 0.2} ry={h * 0.25} fill="white" />
            {/* Top bump */}
            <ellipse cx={w * 0.45} cy={h * 0.35} rx={w * 0.18} ry={h * 0.25} fill="white" />
            {/* Small top-right */}
            <ellipse cx={w * 0.62} cy={h * 0.38} rx={w * 0.14} ry={h * 0.2} fill="white" />
        </svg>
    );
}

/** Cloud definitions — position, size, speed, opacity */
const CLOUDS = [
    { x: -5, y: 12, w: 200, h: 70, opacity: 0.7, speed: 180, delay: 0 },
    { x: 30, y: 5, w: 250, h: 85, opacity: 0.6, speed: 220, delay: -40 },
    { x: 60, y: 18, w: 170, h: 60, opacity: 0.65, speed: 160, delay: -20 },
];

export default function SkyScene() {
    const mounted = useIsClient();
    const containerRef = useRef<HTMLDivElement>(null);
    const simulatedDate = useSimulatedTime();

    const tod = getTimeOfDay(simulatedDate);
    const progress = getPeriodProgress(simulatedDate);

    const stars = useMemo(() => generateStars(35), []);


    // Scroll-driven sky fade & movement
    useEffect(() => {
        if (!mounted) return;
        const onScroll = () => {
            const el = containerRef.current;
            if (!el) return;
            const y = window.scrollY;
            const vh = window.innerHeight;
            const opacity = Math.max(0, 1 - y / (vh * 0.65));
            const translateY = -y * 0.45;
            el.style.opacity = String(opacity);
            // Use translate3d for GPU acceleration without needing global will-change
            el.style.transform = `translate3d(0, ${translateY}px, 0)`;
        };

        let ticking = false;
        const scrollListener = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    onScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', scrollListener, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', scrollListener);
    }, [mounted]);

    if (!mounted) return null;

    const pos = getCelestialPosition(progress);
    const skyGradient = getSkyGradient(tod);
    const isNight = tod === 'night';
    const sunSize = 60;
    const moonSize = 55;

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2,
                pointerEvents: 'none',
                overflow: 'hidden',
                // willChange removed here; it forces a massive GPU layer compositing that stutters Firefox
                maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 82%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 82%)',
            }}
        >
            {/* ── Sky gradient background ── */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: skyGradient,
                    opacity: 0.4,
                    mixBlendMode: isNight ? 'multiply' : 'normal',
                    transition: 'background 3s ease, opacity 3s ease',
                }}
            />

            {/* ── Cartoon Sun (day/morning/sunset) ── */}
            {!isNight && (
                <div
                    className="celestial-glow"
                    style={{
                        position: 'absolute',
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: 'translate(-50%, -50%)',
                        transition: 'left 30s linear, top 30s linear',
                    }}
                >
                    <CartoonSun size={sunSize} />
                </div>
            )}

            {/* ── Cartoon Moon (night) ── */}
            {isNight && (
                <div
                    className="celestial-glow"
                    style={{
                        position: 'absolute',
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: 'translate(-50%, -50%)',
                        transition: 'left 30s linear, top 30s linear',
                    }}
                >
                    <CartoonMoon size={moonSize} />
                </div>
            )}

            {/* ── Cartoon Clouds (day/morning/sunset — not night) ── */}
            {!isNight && CLOUDS.map((cloud, i) => (
                <div
                    key={i}
                    className="cloud"
                    style={{
                        position: 'absolute',
                        left: `${cloud.x}%`,
                        top: `${cloud.y}%`,
                        width: cloud.w,
                        height: cloud.h,
                        opacity: cloud.opacity,
                        animationDuration: `${cloud.speed}s`,
                        animationDelay: `${cloud.delay}s`,
                    }}
                >
                    <CartoonCloud width={cloud.w} height={cloud.h} />
                </div>
            ))}

            {/* ── Stars (night only) ── */}
            {isNight && (
                <div style={{ position: 'absolute', inset: 0 }}>
                    {stars.map((star, i) => (
                        <div
                            key={i}
                            className="star"
                            style={{
                                position: 'absolute',
                                left: `${star.x}%`,
                                top: `${star.y}%`,
                                width: star.size,
                                height: star.size,
                                borderRadius: '50%',
                                background: 'rgba(220, 230, 255, 0.9)',
                                opacity: star.opacity,
                                animationDelay: `${star.delay}s`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* ── Sunset horizon glow ── */}
            {tod === 'sunset' && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '35%',
                        background: 'linear-gradient(to top, rgba(245, 176, 65, 0.15) 0%, rgba(232, 115, 74, 0.08) 40%, transparent 100%)',
                    }}
                />
            )}

            {/* ── Morning horizon warmth ── */}
            {tod === 'morning' && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '30%',
                        background: 'linear-gradient(to top, rgba(252, 211, 166, 0.12) 0%, transparent 100%)',
                    }}
                />
            )}

            {/* ── Night vignette ── */}
            {isNight && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(10, 14, 39, 0.12) 100%)',
                    }}
                />
            )}
        </div>
    );
}
