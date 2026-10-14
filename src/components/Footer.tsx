import Link from 'next/link';

export default function Footer() {
    return (
        <footer style={{
            position: 'relative',
            zIndex: 1,
            padding: '2rem 1.5rem',
            paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))',
            textAlign: 'center',
        }}>
            <div style={{
                maxWidth: '360px',
                margin: '0 auto',
                padding: '1.25rem 1.5rem',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-xl)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}>
                {/* Main tagline */}
                <div style={{
                    fontSize: '0.72rem',
                    color: 'var(--card-text-secondary)',
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                    marginBottom: '0.75rem',
                }}>
                    Live GPS Tracking
                </div>

                {/* Links */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '1.5rem',
                    marginBottom: '0.75rem',
                }}>
                    <Link
                        href="/infos"
                        style={{
                            fontSize: '0.68rem',
                            color: 'var(--card-text-muted)',
                            textDecoration: 'none',
                            transition: 'opacity 0.2s ease',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.7'; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                    >
                        Infos
                    </Link>
                    <Link
                        href="/datenschutz"
                        style={{
                            fontSize: '0.68rem',
                            color: 'var(--card-text-muted)',
                            textDecoration: 'none',
                            transition: 'opacity 0.2s ease',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.7'; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                    >
                        Datenschutz
                    </Link>
                    <Link
                        href="/impressum"
                        style={{
                            fontSize: '0.68rem',
                            color: 'var(--card-text-muted)',
                            textDecoration: 'none',
                            transition: 'opacity 0.2s ease',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.7'; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                    >
                        Impressum
                    </Link>
                </div>

                {/* Copyright */}
                <div style={{
                    fontSize: '0.62rem',
                    color: 'var(--card-text-muted)',
                    fontWeight: 400,
                    opacity: 0.7,
                }}>
                    &copy; 2026 Neusiedlersee Challenge
                </div>
            </div>
        </footer>
    );
}
