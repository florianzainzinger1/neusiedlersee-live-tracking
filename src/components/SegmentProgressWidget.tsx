import { useMemo } from 'react';

interface SegmentData {
    from: number;
    to: number;
    reached: boolean;
    timeStr: string | null;
    paceStr: string | null;
}

interface SegmentProgressWidgetProps {
    distanceKm: number;
    elapsedMs: number;
    started: boolean;
    done: boolean;
    aborted: boolean;
}

const SEGMENT_SIZE = 10;
const TOTAL_DISTANCE = 111;

function formatSegmentTime(elapsedMs: number, distanceKm: number, segmentEnd: number): string | null {
    if (distanceKm < segmentEnd || elapsedMs <= 0) return null;
    // Estimate time at segment end based on linear interpolation
    const ratio = segmentEnd / distanceKm;
    const segMs = elapsedMs * ratio;
    const totalMin = Math.floor(segMs / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatSegmentPace(elapsedMs: number, distanceKm: number, segmentEnd: number): string | null {
    if (distanceKm < segmentEnd || elapsedMs <= 0) return null;
    const ratio = segmentEnd / distanceKm;
    const segMs = elapsedMs * ratio;
    const segHours = segMs / 3600000;
    const speedKmh = segmentEnd / segHours;
    if (speedKmh <= 0) return null;
    const paceMin = 60 / speedKmh;
    const mins = Math.floor(paceMin);
    const secs = Math.round((paceMin - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

export default function SegmentProgressWidget({
    distanceKm,
    elapsedMs,
    started,
    done,
    aborted,
}: SegmentProgressWidgetProps) {
    const segments = useMemo((): SegmentData[] => {
        const segs: SegmentData[] = [];
        for (let i = 0; i < Math.ceil(TOTAL_DISTANCE / SEGMENT_SIZE); i++) {
            const from = i * SEGMENT_SIZE;
            const to = Math.min((i + 1) * SEGMENT_SIZE, TOTAL_DISTANCE);
            const reached = distanceKm >= to;
            segs.push({
                from,
                to,
                reached,
                timeStr: formatSegmentTime(elapsedMs, distanceKm, to),
                paceStr: formatSegmentPace(elapsedMs, distanceKm, to),
            });
        }
        return segs;
    }, [distanceKm, elapsedMs]);

    if (!started && !done && !aborted) return null;

    // Find active segment (current)
    const activeIndex = segments.findIndex(s => !s.reached);
    const progressInSegment = activeIndex >= 0
        ? Math.min(1, Math.max(0, (distanceKm - segments[activeIndex].from) / SEGMENT_SIZE))
        : 1;

    return (
        <section style={{
            marginTop: '2.5rem',
            opacity: 0,
            animation: 'fadeIn 0.6s ease 0.5s both',
        }}>
            <h2 style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--section-label)',
                letterSpacing: '0.15em',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textTransform: 'uppercase',
                textShadow: '0 1px 8px rgba(0,0,0,0.15)',
            }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Etappen
            </h2>

            {/* Desktop: Horizontal Timeline */}
            <div className="glass-card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
                {/* Horizontal view (hidden on mobile) */}
                <div className="segment-desktop" style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    paddingBottom: '0.5rem',
                    scrollbarWidth: 'none',
                }}>
                    {segments.map((seg, i) => {
                        const isActive = i === activeIndex;
                        const isReached = seg.reached;
                        const isPast = isReached;

                        return (
                            <div key={i} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: '70px',
                                flex: '1 0 auto',
                                position: 'relative',
                            }}>
                                {/* Connector line */}
                                {i > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '50%',
                                        width: '100%',
                                        height: '3px',
                                        background: isPast
                                            ? (aborted ? '#dc2626' : 'var(--accent)')
                                            : isActive
                                                ? `linear-gradient(90deg, ${aborted ? '#dc2626' : 'var(--accent)'} ${progressInSegment * 100}%, var(--card-inner-bg) ${progressInSegment * 100}%)`
                                                : 'var(--card-inner-bg)',
                                        transition: 'background 0.8s cubic-bezier(0.4,0,0.2,1)',
                                        zIndex: 0,
                                    }} />
                                )}

                                {/* Dot */}
                                <div style={{
                                    width: isActive ? '14px' : '10px',
                                    height: isActive ? '14px' : '10px',
                                    borderRadius: '50%',
                                    background: isPast
                                        ? (aborted ? '#dc2626' : 'var(--accent)')
                                        : isActive
                                            ? 'var(--accent)'
                                            : 'var(--card-inner-bg)',
                                    border: isActive ? '3px solid var(--accent-light)' : '2px solid var(--card-inner-border)',
                                    boxShadow: isActive ? '0 0 12px var(--accent-glow)' : 'none',
                                    transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
                                    position: 'relative',
                                    zIndex: 1,
                                    animation: isActive ? 'pulse 2s infinite' : 'none',
                                }} />

                                {/* Label */}
                                <div style={{
                                    marginTop: '0.5rem',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    color: isPast || isActive ? 'var(--card-text)' : 'var(--card-text-muted)',
                                    opacity: isPast || isActive ? 1 : 0.5,
                                    transition: 'all 0.5s ease',
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {seg.to} km
                                </div>

                                {/* Mini stats (only for reached segments) */}
                                {seg.timeStr && (
                                    <div style={{
                                        marginTop: '0.25rem',
                                        fontSize: '0.58rem',
                                        color: 'var(--card-text-muted)',
                                        textAlign: 'center',
                                        opacity: 0.7,
                                        lineHeight: 1.3,
                                    }}>
                                        <div>{seg.timeStr}</div>
                                        {seg.paceStr && <div>{seg.paceStr}</div>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Mobile: Vertical Timeline (shown only on mobile via CSS) */}
                <div className="segment-mobile" style={{
                    display: 'none',
                    flexDirection: 'column',
                    gap: '0',
                }}>
                    {segments.map((seg, i) => {
                        const isActive = i === activeIndex;
                        const isReached = seg.reached;

                        return (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                position: 'relative',
                                paddingLeft: '1.5rem',
                                paddingBottom: i < segments.length - 1 ? '1rem' : '0',
                                minHeight: '2rem',
                            }}>
                                {/* Vertical line */}
                                {i < segments.length - 1 && (
                                    <div style={{
                                        position: 'absolute',
                                        left: '10px',
                                        top: '14px',
                                        width: '3px',
                                        height: 'calc(100% - 2px)',
                                        background: isReached
                                            ? (aborted ? '#dc2626' : 'var(--accent)')
                                            : 'var(--card-inner-bg)',
                                        transition: 'background 0.8s ease',
                                        borderRadius: '2px',
                                    }} />
                                )}

                                {/* Dot */}
                                <div style={{
                                    position: 'absolute',
                                    left: isActive ? '4px' : '6px',
                                    top: '2px',
                                    width: isActive ? '14px' : '10px',
                                    height: isActive ? '14px' : '10px',
                                    borderRadius: '50%',
                                    background: isReached
                                        ? (aborted ? '#dc2626' : 'var(--accent)')
                                        : isActive
                                            ? 'var(--accent)'
                                            : 'var(--card-inner-bg)',
                                    border: isActive ? '3px solid var(--accent-light)' : '2px solid var(--card-inner-border)',
                                    boxShadow: isActive ? '0 0 12px var(--accent-glow)' : 'none',
                                    transition: 'all 0.5s ease',
                                    animation: isActive ? 'pulse 2s infinite' : 'none',
                                    flexShrink: 0,
                                }} />

                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        color: isReached || isActive ? 'var(--card-text)' : 'var(--card-text-muted)',
                                        opacity: isReached || isActive ? 1 : 0.5,
                                    }}>
                                        {seg.from}–{seg.to} km
                                    </div>
                                    {seg.timeStr && (
                                        <div style={{
                                            fontSize: '0.65rem',
                                            color: 'var(--card-text-muted)',
                                            marginTop: '0.15rem',
                                        }}>
                                            {seg.timeStr} {seg.paceStr && `· ${seg.paceStr}`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
