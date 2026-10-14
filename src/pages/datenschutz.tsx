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

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ fontSize: '0.9rem', lineHeight: 1.7, color: TEXT_SECONDARY, marginBottom: '0.3rem' }}>
      {children}
    </li>
  );
}

export default function DatenschutzPage() {
  return (
    <div className={inter.className} style={{ minHeight: '100dvh', background: PAGE_BG, color: TEXT_PRIMARY }}>
      <Head>
        <title>Datenschutz – Neusiedlersee Challenge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="description" content="Datenschutzerklärung der Neusiedlersee Challenge." />
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
          letterSpacing: '-0.02em', marginBottom: '0.5rem', lineHeight: 1.2,
        }}>
          Datenschutzerklärung
        </h1>
        <p style={{ fontSize: '0.82rem', color: TEXT_MUTED, marginBottom: '3rem' }}>Stand: Februar 2026</p>

        <Section title="1. Verantwortlicher">
          <P>Neusiedlersee Challenge – privat organisierte Initiative</P>
          <P>E-Mail: kontakt@example.com</P>
          <P>Es handelt sich um kein offizielles Event und keinen eingetragenen Verein.</P>
        </Section>

        <Section title="2. Erhebung und Verarbeitung personenbezogener Daten">
          <P>
            Beim Besuch dieser Website werden automatisch Informationen allgemeiner Natur erfasst.
            Diese Informationen (Server-Logfiles) beinhalten etwa die Art des Webbrowsers, das verwendete
            Betriebssystem, den Domainnamen Ihres Internet Service Providers, Ihre IP-Adresse und ähnliches.
          </P>
          <P>
            Diese Daten werden ausschließlich zur technischen Bereitstellung der Website und zur Gewährleistung
            der Systemsicherheit verarbeitet. Eine Zusammenführung dieser Daten mit anderen Datenquellen wird
            nicht vorgenommen.
          </P>
        </Section>

        <Section title="3. Darstellung von Fotos und Beschreibungen der Teilnehmer">
          <P>
            Auf dieser Website können Fotos und kurze Beschreibungen der Teilnehmer der Neusiedlersee Challenge
            veröffentlicht werden. Dies erfolgt ausschließlich mit Einwilligung der betroffenen Personen gemäß
            Art. 6 Abs. 1 lit. a DSGVO. Eine Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen
            werden.
          </P>
          <P>
            Es werden keine sensiblen personenbezogenen Daten (z.B. Gesundheitsdaten, politische Meinungen,
            religiöse Überzeugungen) veröffentlicht.
          </P>
        </Section>

        <Section title="4. Server-Logfiles">
          <P>
            Der Provider der Seiten erhebt und speichert automatisch Informationen in sogenannten
            Server-Logfiles, die Ihr Browser automatisch an uns übermittelt. Dies sind:
          </P>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
            <Li>Browsertyp und Browserversion</Li>
            <Li>Verwendetes Betriebssystem</Li>
            <Li>Referrer URL</Li>
            <Li>Hostname des zugreifenden Rechners</Li>
            <Li>Uhrzeit der Serveranfrage</Li>
            <Li>IP-Adresse</Li>
          </ul>
          <P>Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.</P>
        </Section>

        <Section title="5. Rechtsgrundlage">
          <P>
            Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage der folgenden Rechtsgrundlagen
            gemäß Art. 6 DSGVO:
          </P>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
            <Li>Art. 6 Abs. 1 lit. a DSGVO – Einwilligung der betroffenen Person</Li>
            <Li>Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse (technischer Betrieb und Sicherheit der Website)</Li>
          </ul>
          <P>Das berechtigte Interesse liegt in der technischen Bereitstellung und Sicherheit der Website.</P>
        </Section>

        <Section title="6. Dauer der Datenspeicherung">
          <P>
            Server-Logfiles werden für maximal 30 Tage gespeichert und anschließend automatisch gelöscht,
            sofern keine längere Aufbewahrung aus Sicherheitsgründen erforderlich ist.
          </P>
          <P>
            Fotos und Beschreibungen der Teilnehmer werden so lange gespeichert, wie die Einwilligung besteht
            bzw. bis ein Widerruf erfolgt.
          </P>
        </Section>

        <Section title="7. Rechte der betroffenen Personen">
          <P>Als betroffene Person haben Sie gemäß DSGVO folgende Rechte:</P>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
            <Li>Recht auf Auskunft (Art. 15 DSGVO)</Li>
            <Li>Recht auf Berichtigung (Art. 16 DSGVO)</Li>
            <Li>Recht auf Löschung (Art. 17 DSGVO)</Li>
            <Li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</Li>
            <Li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</Li>
            <Li>Recht auf Widerspruch (Art. 21 DSGVO)</Li>
          </ul>
          <P>Zur Ausübung Ihrer Rechte wenden Sie sich bitte an: kontakt@example.com</P>
        </Section>

        <Section title="8. Datensicherheit">
          <P>
            Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre personenbezogenen Daten
            gegen zufällige oder vorsätzliche Manipulation, Verlust, Zerstörung oder den Zugriff unberechtigter
            Personen zu schützen. Unsere Sicherheitsmaßnahmen werden entsprechend der technologischen Entwicklung
            fortlaufend überprüft und verbessert.
          </P>
        </Section>

        <Section title="9. Analyse- und Trackingtools">
          <P>
            Auf dieser Website werden keine Drittanbieter-Analyse- oder Trackingtools (z.B. Google Analytics,
            Facebook Pixel o.ä.) eingesetzt. Es erfolgt keine Weitergabe von Daten an Dritte zu Werbezwecken.
          </P>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
