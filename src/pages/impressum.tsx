import Head from 'next/head';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import HamburgerMenu from '../components/HamburgerMenu';
import Footer from '../components/Footer';

const inter = Inter({ subsets: ['latin'] });

const PAGE_BG = 'linear-gradient(180deg, #0d1117 0%, #111827 100%)';
const TEXT_PRIMARY = '#e2e8f0';
const TEXT_SECONDARY = 'rgba(203, 213, 225, 0.82)';
const TEXT_MUTED = 'rgba(148, 163, 184, 0.65)';
const CARD_BG = 'rgba(255, 255, 255, 0.04)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.06)';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: TEXT_PRIMARY, marginBottom: '0.75rem', lineHeight: 1.3 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '0.9rem', lineHeight: 1.75, color: TEXT_SECONDARY, marginBottom: '0.75rem' }}>
      {children}
    </p>
  );
}

export default function ImpressumPage() {
  return (
    <div className={inter.className} style={{ minHeight: '100dvh', background: PAGE_BG, color: TEXT_PRIMARY }}>
      <Head>
        <title>Impressum – Neusiedlersee Challenge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="description" content="Impressum der Neusiedlersee Challenge." />
      </Head>

      <HamburgerMenu />

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '7rem 1.5rem 3rem' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.8rem', fontWeight: 600, color: TEXT_MUTED,
            textDecoration: 'none', marginBottom: '2.5rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Zurück
        </Link>

        <h1 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800,
          letterSpacing: '-0.02em', marginBottom: '3rem', lineHeight: 1.2,
        }}>
          Impressum
        </h1>

        <Section title="Angaben gemäß § 25 MedienG">
          <div style={{
            padding: '1.25rem 1.5rem', background: CARD_BG,
            border: `1px solid ${CARD_BORDER}`, borderRadius: 'var(--radius-xl)',
            fontSize: '0.92rem', lineHeight: 1.8, color: TEXT_PRIMARY, marginBottom: '1rem',
          }}>
            <strong>Neusiedlersee Challenge</strong><br />
            Privat organisierte Initiative<br /><br />
            E-Mail: kontakt@example.com
          </div>
          <P>
            Es handelt sich um kein offizielles Event, keinen eingetragenen Verein
            und keine gewerbliche Tätigkeit.
          </P>
        </Section>

        <Section title="Haftungsausschluss">
          <P>
            Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt.
            Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch
            keine Gewähr übernommen werden. Eine Haftung für Schäden, die durch die Nutzung
            oder Nichtnutzung der dargebotenen Informationen entstehen, ist ausgeschlossen,
            sofern kein nachweislich vorsätzliches oder grob fahrlässiges Verschulden vorliegt.
          </P>
          <P>
            Für externe Links wird keine Haftung übernommen. Für den Inhalt der verlinkten
            Seiten sind ausschließlich deren Betreiber verantwortlich.
          </P>
        </Section>

        <Section title="Urheberrecht">
          <P>
            Die auf dieser Website veröffentlichten Inhalte und Werke unterliegen dem
            österreichischen Urheberrecht. Jede vom Urheberrecht nicht zugelassene
            Verwertung bedarf der vorherigen schriftlichen Zustimmung des jeweiligen
            Rechteinhabers. Dies gilt insbesondere für Vervielfältigung, Bearbeitung,
            Übersetzung, Speicherung, Verarbeitung bzw. Wiedergabe von Inhalten.
          </P>
          <P>
            Die Verwendung von auf dieser Website veröffentlichten Fotos und Texten
            in anderen elektronischen oder gedruckten Publikationen ist ohne ausdrückliche
            Zustimmung nicht gestattet.
          </P>
        </Section>

        <Section title="Hinweis">
          <P>
            Die Neusiedlersee Challenge ist eine privat organisierte Unternehmung ohne
            kommerzielle Absicht. Es handelt sich um kein offizielles, behördlich
            genehmigtes oder kommerziell veranstaltetes Event.
          </P>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
