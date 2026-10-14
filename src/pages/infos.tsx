import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DM_Sans } from 'next/font/google';
import HamburgerMenu from '../components/HamburgerMenu';
import Footer from '../components/Footer';

const dmSans = DM_Sans({ subsets: ['latin'] });

const PAGE_BG = 'linear-gradient(180deg, #0d1117 0%, #111827 100%)';
const TEXT_PRIMARY = '#e2e8f0';
const TEXT_SECONDARY = 'rgba(203, 213, 225, 0.82)';
const TEXT_MUTED = 'rgba(148, 163, 184, 0.65)';
const CARD_BG = 'rgba(255, 255, 255, 0.04)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.06)';
const DIVIDER = 'rgba(255, 255, 255, 0.06)';

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 'var(--radius-xl)',
        marginBottom: '0.75rem',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '1.25rem 1.5rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1.4 }}>
          {q}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={TEXT_MUTED}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        style={{
          maxHeight: open ? '200px' : '0',
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.25s ease',
        }}
      >
        <div style={{
          padding: '0 1.5rem 1.25rem',
          fontSize: '0.9rem',
          color: TEXT_SECONDARY,
          lineHeight: 1.6,
        }}>
          {a}
        </div>
      </div>
    </div>
  );
}

export default function InfosPage() {
  return (
    <div className={dmSans.className} style={{ minHeight: '100dvh', background: PAGE_BG, color: TEXT_PRIMARY }}>
      <Head>
        <title>Infos – Neusiedlersee Challenge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="description" content="Alle Informationen zur Neusiedlersee Challenge – 111 km rund um den Neusiedlersee." />
      </Head>

      <HamburgerMenu />

      {/* ═══ HERO ═══ */}
      <header style={{ padding: '7rem 1.5rem 3.5rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.8rem', fontWeight: 600, color: TEXT_MUTED,
            textDecoration: 'none', marginBottom: '3rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück
        </Link>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1.5rem, 5vw, 3rem)', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {['111 Kilometer.', 'Neusiedlersee.', '6 Personen.'].map((text, i) => (
            <div key={i} style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', fontWeight: 700, color: TEXT_PRIMARY, whiteSpace: 'nowrap' }}>
              {text}
            </div>
          ))}
        </div>

        <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.15rem)', lineHeight: 1.75, color: TEXT_SECONDARY, maxWidth: '600px', margin: '0 auto' }}>
          Die Neusiedlersee Challenge ist ein durchgehender Ultra-Marsch rund um den Neusiedlersee.
          Ziel ist es, die gesamte Strecke zu Fuß in einem Wachzyklus zu absolvieren.
        </p>
      </header>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '0 1.5rem 3rem' }}>

        {/* ═══ STRECKE ═══ */}
        <section style={{ marginBottom: '3rem' }}>
          <hr style={{ border: 'none', height: '1px', background: DIVIDER, marginBottom: '3rem' }} />
          <h2 style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)', fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
            Die Strecke
          </h2>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.75, color: TEXT_SECONDARY, marginBottom: '1.25rem' }}>
            Die Route führt einmal vollständig rund um den Neusiedlersee.
            Die Distanz beträgt 111 Kilometer und verläuft durch Österreich und Ungarn.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1.25rem', background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
            borderRadius: '0.75rem',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d9e6a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div>
              <div style={{ fontSize: '0.65rem', color: TEXT_MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Geplanter Start</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: TEXT_PRIMARY, marginTop: '2px' }}>2. Mai, 06:00 AM CET</div>
            </div>
          </div>
          <p style={{ marginTop: '1.25rem', fontSize: '0.88rem', color: TEXT_MUTED }}>
            Start- und Zielpunkt sind identisch.
          </p>
        </section>

        {/* ═══ REGELN ═══ */}
        <section style={{ marginBottom: '3rem' }}>
          <hr style={{ border: 'none', height: '1px', background: DIVIDER, marginBottom: '3rem' }} />
          <h2 style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)', fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
            Regeln
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              'Alle Teilnehmer starten gemeinsam.',
              'Kein Transportmittel ist erlaubt.',
              'Die gesamte Strecke muss zu Fuß absolviert werden.',
              'Die Challenge muss innerhalb eines durchgehenden Wachzyklus abgeschlossen werden.',
              'Bricht ein Teilnehmer ab, darf der Rest der Gruppe weitergehen.',
              'Kein offizielles Event.',
            ].map((rule, i) => (
              <li key={i} style={{
                fontSize: '0.95rem', lineHeight: 1.7, color: TEXT_SECONDARY,
                paddingLeft: '1rem', marginBottom: '0.5rem', position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: 0, color: '#2d9e6a', fontWeight: 700 }}>·</span>
                {rule}
              </li>
            ))}
          </ul>
        </section>

        {/* ═══ FAQ ═══ */}
        <section style={{ marginBottom: '2rem' }}>
          <hr style={{ border: 'none', height: '1px', background: DIVIDER, marginBottom: '3rem' }} />
          <h2 style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)', fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
            FAQ
          </h2>
          <FaqItem q="Ist das ein offizielles Event?" a="Nein, es handelt sich um eine privat organisierte Herausforderung." />
          <FaqItem q="Was passiert, wenn ein Teilnehmer abbricht?" a="Die verbleibenden Teilnehmer können die Challenge fortsetzen." />
          <FaqItem q="Was passiert, wenn alle Teilnehmer abbrechen?" a="Die Challenge gilt als nicht bestanden." />
        </section>
      </main>

      <Footer />
    </div>
  );
}
