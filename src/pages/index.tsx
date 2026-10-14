import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Inter } from 'next/font/google';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { useTrackpoints } from '../hooks/useTrackpoints';
import { useChallenge } from '../hooks/useChallenge';
import { useChallengeStats } from '../hooks/useChallengeStats';
import { usePhotos } from '../hooks/usePhotos';
import { useIsClient } from '../hooks/useIsClient';
import { useNow } from '../hooks/useNow';
import { useThrottledStats } from '../hooks/useThrottledStats';
import { challengeConfig } from '../lib/challengeConfig';
import { formatTime } from '../lib/geo';
import Countdown from '../components/Countdown';
import Footer from '../components/Footer';
import HamburgerMenu from '../components/HamburgerMenu';
import SegmentProgressWidget from '../components/SegmentProgressWidget';

const BlurMapBackground = dynamic(() => import('../components/BlurMapBackground'), { ssr: false });
const SkyScene = dynamic(() => import('../components/SkyScene'), { ssr: false });
const WeatherWidget = dynamic(() => import('../components/WeatherWidget'), { ssr: false });

const inter = Inter({ subsets: ['latin'] });

// Placeholder names: the real participant list is not part of the public repository.
const TEAM_MEMBERS = [
  { name: 'Teilnehmer A', initials: 'A', color: '#059669' },
  { name: 'Teilnehmer B', initials: 'B', color: '#3b82f6' },
  { name: 'Teilnehmer C', initials: 'C', color: '#8b5cf6' },
  { name: 'Teilnehmer D', initials: 'D', color: '#f59e0b' },
  { name: 'Teilnehmer E', initials: 'E', color: '#ec4899' },
  { name: 'Teilnehmer F', initials: 'F', color: '#14b8a6' },
];

const isDev = process.env.NEXT_PUBLIC_ENV !== 'prod';

/* ── Trail Divider — full-width elegant trail ──────────────── */

/** Deterministic pseudo-random trail path (seeded), computed once at module load. */
function buildTrailPath(): string {
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const W = 1200, H = 50, midY = H / 2;
  const numPts = 50;
  const pts: { x: number; y: number }[] = [];
  let prevY = midY;
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const x = t * W;
    if (i === 0) { pts.push({ x: 0, y: midY }); continue; }
    const maxStep = 4 + rand() * 10;
    const dir = rand() > 0.5 ? 1 : -1;
    const pull = (midY - prevY) * rand() * 0.4;
    let y = prevY + dir * maxStep + pull;
    y = Math.max(8, Math.min(H - 8, y));
    pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    prevY = y;
  }
  const tension = 0.3;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

const TRAIL_PATH = buildTrailPath();

function TrailDivider() {
  const trail = TRAIL_PATH;

  return (
    <div style={{
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto 1rem',
      padding: '0 2rem',
      opacity: 0,
      animation: 'fadeIn 1s ease 0.6s both',
    }}>
      <svg
        viewBox="0 0 1200 50"
        width="100%"
        height="50"
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
        role="presentation"
      >
        {/* Glow path */}
        <path d={trail} fill="none" stroke="var(--accent-glow)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {/* Main path */}
        <path d={trail} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      </svg>
    </div>
  );
}

/* ── Skeleton card for loading states ───────────────────────── */

function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div className="skeleton skeleton-text" style={{ width: '40%', height: '0.6rem' }} />
      <div className="skeleton skeleton-text-lg" style={{ width: '70%', marginTop: '1rem' }} />
      <div className="skeleton skeleton-text" style={{ width: '50%', marginTop: '0.75rem', height: '0.7rem' }} />
    </div>
  );
}

/* ── Smooth animated KM display ────────────────────────────── */

function AnimatedKm({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(value);
  const startTimeRef = useRef(0);
  // Last value passed to setDisplay, so the animation can start from the
  // on-screen value without the effect depending on `display`.
  const displayRef = useRef(value);

  useEffect(() => {
    const show = (v: number) => {
      displayRef.current = v;
      setDisplay(v);
    };

    if (Math.abs(value - startRef.current) < 0.01) {
      // Tiny change: jump straight to the value on the next frame
      rafRef.current = requestAnimationFrame(() => show(value));
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
    startRef.current = displayRef.current;
    startTimeRef.current = performance.now();
    const duration = 800; // ms

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startRef.current + (value - startRef.current) * eased;
      show(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <>{display.toFixed(1)}</>;
}

/* ── Stat icon SVGs ─────────────────────────────────────────── */

const ClockIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const BoltIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
const FlagIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>;
const TeamIcon = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const NavIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>;
const CameraIcon = ({ size = 18 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;

/* ── Photo lightbox with keyboard navigation ────────────────── */

function PhotoLightbox({ photos, initialIndex, onClose }: {
  photos: { id: string; url: string; timestamp: number; kmMarkerText: string }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];

  const goPrev = useCallback(() => setIndex(i => (i > 0 ? i - 1 : photos.length - 1)), [photos.length]);
  const goNext = useCallback(() => setIndex(i => (i < photos.length - 1 ? i + 1 : 0)), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  if (!photo) return null;

  const photoDate = new Date(photo.timestamp);
  const timeStr = `${photoDate.getHours().toString().padStart(2, '0')}:${photoDate.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button className="lightbox-close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>

      {photos.length > 1 && (
        <>
          <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous photo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next photo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element -- static export with images.unoptimized: next/image adds no optimization for these remote photo URLs */}
      <img
        src={photo.url}
        alt={`Challenge Photo ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '0.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', cursor: 'default' }}
      />

      <div style={{
        position: 'absolute',
        bottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
        left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '1rem',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        padding: '6px 16px', borderRadius: '9999px',
        color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 600,
        fontVariantNumeric: 'tabular-nums', zIndex: 1,
      }}>
        <span>{timeStr}</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>{photo.kmMarkerText !== "\u2014" ? `${photo.kmMarkerText} km` : "\u2014 km"}</span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>{index + 1} / {photos.length}</span>
      </div>
    </div>
  );
}

/* ── Elegant confetti for completion ──────────────────────── */

function ElegantConfetti() {
  const particles = useMemo(() => {
    const colors = ['#2d9e6a', '#1a7a4a', '#34d399', '#059669', '#a7f3d0'];
    return Array.from({ length: 40 }).map((_, i) => ({
      left: `${(i * 2.5 + Math.sin(i) * 8 + 5) % 100}%`,
      size: 4 + (i % 4) * 2,
      color: colors[i % colors.length],
      duration: 3 + (i % 5) * 0.8,
      delay: (i % 8) * 0.3,
      isCircle: i % 3 === 0,
    }));
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 9995, overflow: 'hidden' }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '-8px',
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            animation: `elegantConfetti ${p.duration}s ease-in ${p.delay}s forwards`,
            opacity: 0.7,
            transform: `rotate(${(i * 37) % 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main Home Component ────────────────────────────────────── */

export default function Home() {
  const mounted = useIsClient();
  const { location } = useLiveLocation('live');
  const { trackpoints } = useTrackpoints();
  const { challenge, loading: challengeLoading } = useChallenge();
  // The clock stops once the challenge is finished; the stats are frozen at that point.
  const now = useNow(challenge.done || challenge.aborted);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [confettiDismissed, setConfettiDismissed] = useState(false);

  const {
    distanceKm, remainingKm, avgSpeedKmh, paceString, elapsedMs, etaString, trackpointKmSeries
  } = useChallengeStats(challenge, location, trackpoints, now);

  const { photos, loading: photosLoading } = usePhotos(trackpointKmSeries);

  // Throttled display values
  const { displayPace, displaySpeed, displayEta } = useThrottledStats(paceString, avgSpeedKmh, etaString, now);

  const isAborted = challenge.aborted;
  const isSuccess = challenge.done && !isAborted;
  const isFinalState = challenge.done || challenge.aborted;
  const goldGradient = { background: 'linear-gradient(90deg, #1a7a4a, #2d9e6a)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const };
  const statColor = isSuccess ? goldGradient : (isAborted ? { color: '#dc2626' } : { color: 'var(--text-primary)' });

  // Confetti on done — elegant version. Shown for 5 s each time the challenge becomes done.
  if (!isSuccess && confettiDismissed) {
    setConfettiDismissed(false);
  }
  const showConfetti = isSuccess && !confettiDismissed;
  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(() => setConfettiDismissed(true), 5000);
    return () => clearTimeout(timer);
  }, [isSuccess]);

  if (!mounted) return null;

  const progressPercent = Math.min(100, (distanceKm / challengeConfig.plannedDistanceKm) * 100);
  const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get("debug") === "1";
  const isDataReady = !challengeLoading;
  const countdownReached = now !== null && now >= new Date(challengeConfig.challengeStartISO).getTime();

  return (
    <div className={inter.className} style={{ minHeight: '100dvh', position: 'relative', color: 'var(--text-primary)' }}>
      <Head>
        <title>{challengeConfig.challengeTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="description" content={challengeConfig.challengeSubtitle} />
      </Head>

      {/* ═══ HAMBURGER MENU ═══ */}
      <HamburgerMenu />

      {/* ═══ ATMOSPHERIC LAYERS (fixed, no scroll interception) ═══ */}
      <div className="background-layer" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <BlurMapBackground debug={isDebug} />
        <SkyScene />
      </div>

      {/* ═══ MAIN CONTENT — scrolls with body ═══ */}
      <div className="content-layer" style={{ position: 'relative', zIndex: 1 }}>

        {/* Debug Stats */}
        {isDebug && (
          <div style={{ position: 'fixed', bottom: 10, left: 10, zIndex: 9999, background: 'rgba(0,0,0,0.85)', padding: '10px', borderRadius: '8px', fontSize: '10px', fontFamily: 'monospace', maxWidth: '300px', color: '#fff' }}>
            <div style={{ color: '#d4a650', marginBottom: 4 }}>RUNTIME DEBUG</div>
            <div>Trackpoints: {trackpoints.length}</div>
            <div>Dist: {distanceKm.toFixed(3)} km</div>
            {photos.length > 0 && (
              <div style={{ marginTop: '5px', borderTop: '1px solid #333', paddingTop: '5px' }}>
                Photo 0: ID: {photos[0].id} | km: {photos[0].kmMarkerText}
              </div>
            )}
          </div>
        )}

        {/* ═══ HERO ═══ */}
        <header style={{ padding: '6rem 1.5rem 2rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', opacity: 0, animation: 'fadeInUp 0.8s ease-out 0.1s both' }}>

            {/* Abort Banner */}
            {challenge.aborted && (
              <div style={{
                background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)',
                padding: '1rem 1.25rem', borderRadius: 'var(--radius-xl)',
                marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                textAlign: 'left', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              }}>
                <div style={{ color: '#dc2626', marginTop: '2px', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#dc2626', fontSize: '0.95rem', fontWeight: 700 }}>Challenge abgebrochen</h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#f87171', fontSize: '0.85rem', lineHeight: 1.4 }}>Es ist kein Teilnehmer mehr auf der Strecke.</p>
                </div>
              </div>
            )}

            {/* Status Chip — only renders for active states or when countdown reaches 0 */}
            {(challenge.aborted || challenge.done || challenge.started || countdownReached) && (
              <div className="status-chip" style={{ marginBottom: '2rem' }}>
                {challenge.aborted ? (
                  <><div className="status-dot" style={{ background: '#dc2626' }} /><span className="status-text" style={{ color: '#dc2626' }}>ABGEBROCHEN</span></>
                ) : challenge.done ? (
                  <><div className="status-dot" style={{ background: '#2d9e6a' }} /><span className="status-text" style={{ color: '#2d9e6a' }}>GESCHAFFT</span></>
                ) : challenge.started ? (
                  <><div className="status-dot" style={{ background: '#10b981', boxShadow: '0 0 10px #10b981', animation: 'pulse 2s infinite' }} /><span className="status-text" style={{ color: '#10b981' }}>LIVE</span></>
                ) : (
                  <><div className="status-dot" style={{ background: '#2d9e6a', animation: 'breathe 3s ease-in-out infinite' }} /><span className="status-text" style={{ color: '#2d9e6a' }}>STARTING SOON</span></>
                )}
              </div>
            )}

            {/* Title */}
            <h1 style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              fontWeight: 800, margin: '0 0 1rem',
              letterSpacing: '-0.03em', lineHeight: 1.1,
              color: 'var(--hero-text)',
              textShadow: 'var(--hero-text-shadow)',
            }}>
              {challengeConfig.challengeTitle}
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
              color: 'var(--hero-subtitle)',
              margin: '0 0 2rem', lineHeight: 1.7, fontWeight: 400,
              maxWidth: '550px', marginLeft: 'auto', marginRight: 'auto',
              textShadow: '0 1px 12px rgba(0,0,0,0.2)',
            }}>
              {challengeConfig.challengeSubtitle}
            </p>

            {/* Weather Widget */}
            <div style={{ marginBottom: '1.5rem' }}>
              <WeatherWidget />
            </div>

            <Countdown />

            {/* CTA Button */}
            <Link href="/live" className="btn btn-primary" style={{ textDecoration: 'none', gap: '0.75rem', padding: '1.15rem 2.5rem', fontSize: '1.1rem' }}>
              <NavIcon />
              Live Map
            </Link>
          </div>
        </header>

        {/* ═══ TRAIL DIVIDER ═══ */}
        <TrailDivider />

        {/* ═══ CONTENT ═══ */}
        <main style={{
          maxWidth: '1100px', margin: '0 auto', padding: '0 1rem 3rem',
        }}>

          {/* ── Progress Card ── */}
          {(challenge.started || isFinalState) && (
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem', opacity: 0, animation: 'staggerIn 0.5s ease 0.2s both' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ color: 'var(--card-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '0.5rem' }}>Fortschritt</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, ...statColor, lineHeight: 1 }}>
                    <AnimatedKm value={distanceKm} /> <span style={{ fontSize: '1.25rem', color: 'var(--card-text-muted)' }}>km</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--card-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '0.5rem' }}>Ziel</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--card-text-secondary)', lineHeight: 1 }}>{challengeConfig.plannedDistanceKm} km</div>
                </div>
              </div>
              <div style={{ height: '6px', background: 'var(--card-inner-bg)', overflow: 'hidden', position: 'relative', borderRadius: '9999px' }}>
                <div
                  className={(challenge.started && !isFinalState) ? "shimmerWalk" : ""}
                  style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: `${progressPercent}%`,
                    background: isSuccess ? 'var(--gradient-gold)' : (challenge.aborted ? '#dc2626' : 'var(--gradient-progress)'),
                    transition: 'width 1s ease-out',
                    borderRadius: '9999px',
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Stats Grid — 2x2 mobile, 4 col desktop ── */}
          {!isDataReady ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}>
              {/* Elapsed Time */}
              <div className="glass-card stat-card" style={{ opacity: 0, animation: 'staggerIn 0.5s ease 0.3s both' }}>
                <div className="stat-label">
                  <span>Dauer</span>
                  <span style={{ color: 'var(--accent)', opacity: 0.6 }}><ClockIcon /></span>
                </div>
                <div className="stat-value" style={isSuccess ? goldGradient : (isAborted ? { color: '#dc2626' } : { color: 'var(--card-text)' })}>
                  {challenge.started ? formatTime(elapsedMs) : '00:00:00'}
                </div>
                <div className="stat-sub">
                  {challenge.started ? 'Seit Start' : 'Warte auf Start'}
                </div>
              </div>

              {/* Pace */}
              <div className="glass-card stat-card" style={{ opacity: 0, animation: 'staggerIn 0.5s ease 0.4s both' }}>
                <div className="stat-label">
                  <span>Pace</span>
                  <span style={{ color: 'var(--accent)', opacity: 0.6 }}><BoltIcon /></span>
                </div>
                <div className="stat-value" style={isSuccess ? goldGradient : (isAborted ? { color: '#dc2626' } : { color: 'var(--card-text)' })}>{displayPace}</div>
                <div className="stat-sub">
                  <span style={{ background: 'var(--card-inner-bg)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--card-inner-border)' }}>
                    {displaySpeed.toFixed(1)} km/h
                  </span>
                </div>
              </div>

              {/* ETA */}
              <div className="glass-card stat-card" style={{ opacity: 0, animation: 'staggerIn 0.5s ease 0.5s both' }}>
                <div className="stat-label">
                  <span>Zielzeit</span>
                  <span style={{ color: 'var(--accent)', opacity: 0.6 }}><FlagIcon /></span>
                </div>
                <div className="stat-value" style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.4, ...(isSuccess ? goldGradient : (isAborted ? { color: '#dc2626' } : { color: 'var(--card-text)' })) }}>{displayEta}</div>
                <div className="stat-sub">Noch {remainingKm.toFixed(1)} km</div>
              </div>

              {/* Team */}
              <div
                className="glass-card interactive-card stat-card"
                onClick={() => setTeamModalOpen(true)}
                role="button"
                tabIndex={0}
                aria-label="Team anzeigen"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTeamModalOpen(true); } }}
                style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0, animation: 'staggerIn 0.5s ease 0.6s both' }}
              >
                <div style={{ color: 'var(--accent)', opacity: 0.6 }}><TeamIcon /></div>
                {/* Avatar stack */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {TEAM_MEMBERS.slice(0, 4).map((m, i) => (
                    <div key={m.name} style={{
                      width: 28, height: 28, borderRadius: '50%', background: m.color,
                      border: '2px solid var(--card-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700, color: 'white',
                      marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i, position: 'relative',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}>
                      {m.initials[0]}
                    </div>
                  ))}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'var(--card-inner-bg)',
                    border: '2px solid var(--card-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.55rem', fontWeight: 700, color: 'var(--card-text-muted)',
                    marginLeft: -8, position: 'relative',
                  }}>
                    +{TEAM_MEMBERS.length - 4}
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--card-text)', lineHeight: 1 }}>
                  {challenge.participants} <span style={{ fontSize: '1.25rem', color: 'var(--card-text-muted)', fontWeight: 500 }}>/ 6</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="stat-sub" style={{ margin: 0 }}>Team</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--card-text-muted)', opacity: 0.6 }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
            </div>
          )}

          {/* ── Segment Progress Widget ── */}
          <SegmentProgressWidget
            distanceKm={distanceKm}
            elapsedMs={elapsedMs}
            started={challenge.started}
            done={challenge.done}
            aborted={challenge.aborted}
          />

          {/* ── Photo Diary ── */}
          <section id="tagebuch" style={{ marginTop: '3.5rem', opacity: 0, animation: 'fadeIn 0.6s ease 0.7s both' }}>
            <h2 style={{
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--hero-text)',
              letterSpacing: '0.15em', marginBottom: '1.5rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              textTransform: 'uppercase',
              textShadow: '0 1px 4px rgba(0,0,0,0.3), 0 2px 12px rgba(0,0,0,0.2)',
              opacity: 0.85,
            }}>
              <CameraIcon />
              Tagebuch
            </h2>

            {photosLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                    <div className="skeleton" style={{ width: '100%', height: '200px', borderRadius: 0 }} />
                    <div style={{ padding: '1rem' }}>
                      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : photos.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CameraIcon size={36} />
                <div style={{ fontSize: '0.9rem', marginTop: '1rem', lineHeight: 1.5 }}>
                  Noch keine Fotos vorhanden.
                  <br />
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Fotos erscheinen hier sobald die Challenge gestartet ist.</span>
                </div>
              </div>
            ) : (
              <div style={{ columns: '320px 3', gap: '1rem', columnFill: 'balance' }}>
                {photos.map((photo, index) => {
                  const photoDate = new Date(photo.timestamp);
                  const timeStr = `${photoDate.getHours().toString().padStart(2, '0')}:${photoDate.getMinutes().toString().padStart(2, '0')}`;
                  return (
                    <div
                      key={photo.id}
                      className="photo-card"
                      role="button"
                      tabIndex={0}
                      aria-label={`Photo ${index + 1}, ${timeStr}, ${photo.kmMarkerText} km`}
                      onClick={() => setSelectedPhotoIndex(index)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPhotoIndex(index); } }}
                      style={{
                        position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)', cursor: 'pointer',
                        breakInside: 'avoid', marginBottom: '1rem',
                        opacity: 0, animation: `photoFadeIn 0.5s ease ${Math.min(index * 0.08, 0.8)}s both`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- static export with images.unoptimized: next/image adds no optimization for these remote photo URLs */}
                      <img
                        src={photo.url}
                        alt={`Challenge Photo ${index + 1}`}
                        loading="lazy"
                        style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: '60vh', transition: 'transform 0.4s ease' }}
                      />
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
                        pointerEvents: 'none',
                      }} />
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        display: 'flex', justifyContent: 'space-between', padding: '10px 12px',
                        pointerEvents: 'none',
                      }}>
                        <div style={{
                          color: 'white', fontSize: '0.72rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '4px',
                          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          {timeStr}
                        </div>
                        <div style={{
                          color: 'white', fontSize: '0.72rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '4px',
                          textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                          {photo.kmMarkerText !== "\u2014" ? `${photo.kmMarkerText} km` : "\u2014 km"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Photo Lightbox ── */}
          {selectedPhotoIndex !== null && (
            <PhotoLightbox
              photos={photos}
              initialIndex={selectedPhotoIndex}
              onClose={() => setSelectedPhotoIndex(null)}
            />
          )}

          {/* ── Team Modal — responsive, no overflow ── */}
          {teamModalOpen && (
            <div
              onClick={() => setTeamModalOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Team"
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem', animation: 'modalFadeIn 0.25s ease',
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                className="glass-card"
                style={{
                  borderRadius: 'var(--radius-2xl)',
                  padding: '1.5rem', maxWidth: '500px', width: '100%',
                  maxHeight: '90vh', overflowY: 'auto',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
                  animation: 'modalSlideUp 0.3s var(--ease-spring)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--card-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.25rem' }}>Neusiedlersee Challenge</div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--card-text)' }}>Das Team</h3>
                  </div>
                  <button
                    onClick={() => setTeamModalOpen(false)}
                    aria-label="Close"
                    style={{
                      background: 'var(--card-inner-bg)', border: '1px solid var(--card-inner-border)', cursor: 'pointer',
                      color: 'var(--card-text-muted)', width: '36px', height: '36px',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', transition: 'all 0.2s',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>

                <div className="team-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {TEAM_MEMBERS.map((member, i) => (
                    <div key={member.name} className="team-member-card" style={{
                      display: 'flex', gap: '0.75rem', alignItems: 'center',
                      padding: '0.875rem', borderRadius: 'var(--radius-lg)',
                      background: 'var(--card-inner-bg)', border: '1px solid var(--card-inner-border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      opacity: 0, animation: `staggerIn 0.3s ease ${0.05 * i}s both`,
                    }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%',
                        background: `linear-gradient(135deg, ${member.color}, ${member.color}cc)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800, color: 'white', flexShrink: 0,
                        boxShadow: `0 4px 12px ${member.color}40`,
                      }}>
                        {member.initials}
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--card-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--card-inner-border)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--card-text-muted)' }}>
                  {challenge.participants} von 6 Teilnehmern aktiv
                </div>
              </div>
            </div>
          )}

        </main>

        {/* ═══ FOOTER ═══ */}
        <Footer />
      </div>

      {/* ═══ ELEGANT CONFETTI ═══ */}
      {showConfetti && <ElegantConfetti />}

      {/* DEV Badge — only on index, not on /live */}
      {isDev && <div className="dev-badge">DEV</div>}
    </div>
  );
}
