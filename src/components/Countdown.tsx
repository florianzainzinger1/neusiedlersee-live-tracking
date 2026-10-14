import React, { useState, useEffect, useRef } from 'react';
import { challengeConfig } from '../lib/challengeConfig';
import { useNow } from '../hooks/useNow';

const TARGET_DATE = new Date(challengeConfig.challengeStartISO).getTime();

/* ── Single animated digit — ref-based, CSS keyframe driven ── */
function FlipDigit({ digit }: { digit: string }) {
    const currentRef = useRef(digit);
    const [state, setState] = useState({
        current: digit,
        previous: null as string | null,
        animKey: 0,
    });

    useEffect(() => {
        if (digit !== currentRef.current) {
            const prev = currentRef.current;
            currentRef.current = digit;
            setState(s => ({ current: digit, previous: prev, animKey: s.animKey + 1 }));

            const timer = setTimeout(() => {
                setState(s => ({ ...s, previous: null }));
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [digit]);

    return (
        <span style={{
            display: 'inline-block',
            position: 'relative',
            width: '0.95em',
            height: '1.25em',
            overflow: 'hidden',
            verticalAlign: 'top',
        }}>
            {/* Exiting digit — slides up, fades out */}
            {state.previous !== null && (
                <span
                    key={`out-${state.animKey}`}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'flipDigitExit 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                    }}
                >
                    {state.previous}
                </span>
            )}
            {/* Current digit — slides in from below (or static on initial render) */}
            <span
                key={`in-${state.animKey}`}
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: state.animKey > 0
                        ? 'flipDigitEnter 0.35s cubic-bezier(0.4, 0, 0.2, 1) both'
                        : 'none',
                }}
            >
                {state.current}
            </span>
        </span>
    );
}

/* ── Animated number display (each digit animates separately) ── */
function AnimatedNumber({ value, padLength = 2 }: { value: number; padLength?: number }) {
    const str = value.toString().padStart(padLength, '0');
    return (
        <span style={{
            display: 'inline-flex',
            fontVariantNumeric: 'tabular-nums',
        }}>
            {str.split('').map((digit, i) => (
                <FlipDigit key={`${padLength}-${i}`} digit={digit} />
            ))}
        </span>
    );
}

/* ── Time Block (single unit: days/hours/minutes/seconds) ── */
function TimeBlock({ value, label }: { value: number; label: string }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '0.625rem',
            padding: '0.85rem 0.5rem',
            minWidth: '56px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: 'var(--card-shadow)',
        }}>
            <div style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                color: 'var(--card-text)',
                lineHeight: 1,
                height: '1.65rem',
                position: 'relative',
                top: '-1px',
            }}>
                <AnimatedNumber value={value} padLength={value > 99 ? 3 : 2} />
            </div>
            <span style={{
                fontSize: '0.65rem',
                color: 'var(--card-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginTop: '0.4rem',
                fontWeight: 700,
                lineHeight: 1,
            }}>
                {label}
            </span>
        </div>
    );
}

export default function Countdown() {
    const now = useNow();

    if (now === null) return null;

    const diff = TARGET_DATE - now;

    if (diff <= 0) {
        return (
            <div style={{
                margin: '2rem auto',
                padding: '1rem 2rem',
                background: 'rgba(5, 150, 105, 0.15)',
                border: '1px solid rgba(5, 150, 105, 0.25)',
                borderRadius: '1rem',
                display: 'inline-block',
                backdropFilter: 'blur(12px)',
            }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#10b981', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Die Challenge läuft jetzt!
                </span>
            </div>
        );
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return (
        <div style={{
            margin: '1.5rem auto 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
        }}>
            <div style={{
                fontSize: '0.65rem',
                color: 'var(--hero-subtitle)',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                fontWeight: 600,
                textShadow: '0 1px 8px rgba(0,0,0,0.2)',
            }}>
                Start in
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                flexWrap: 'nowrap',
                whiteSpace: 'nowrap',
                padding: '0.25rem',
                borderRadius: '1rem',
            }}>
                <TimeBlock value={days} label="Tage" />
                <TimeBlock value={hours} label="Std" />
                <TimeBlock value={minutes} label="Min" />
                <TimeBlock value={seconds} label="Sek" />
            </div>
        </div>
    );
}
